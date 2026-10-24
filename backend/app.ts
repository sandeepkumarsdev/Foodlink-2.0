import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';
import { 
  pg, 
  query,
  initPostgres, 
  seedPostgresData, 
  mapRowToUser, 
  mapRowToFoodPost, 
  mapRowToNotification, 
  mapRowToClaim 
} from './server/db.js';
import { FoodPost, User, NotificationItem, Claim, RealtimeEvent, DashboardStats } from './types/index.js';

const app = express();
app.use(cors());
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

let dbInitPromise: Promise<void> | null = null;
export async function ensureDbInitialized(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = initPostgres().catch((err) => {
      console.error('Failed to initialize PostgreSQL:', err);
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

// URL Normalization and DB Initialization Middleware for Vercel Serverless & Local
app.use(async (req: Request, res: Response, next) => {
  const original = (req.headers['x-forwarded-uri'] as string) || (req.headers['x-matched-path'] as string);
  if (original && (req.url === '/api' || req.url === '/api/index')) {
    req.url = original;
  }
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  try {
    await ensureDbInitialized();
    next();
  } catch (err: any) {
    console.error('Database connection/initialization error:', err);
    res.status(500).json({
      error: 'Database connection failed. Please ensure POSTGRES_URL is set in your Vercel Project Settings.',
      details: err.message,
    });
  }
});

// Concurrency mutex lock per foodPostId to guarantee atomic claim execution in Node
const claimLocks = new Map<string, Promise<void>>();

function acquireLock(key: string): Promise<() => void> {
  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });

  const currentPromise = claimLocks.get(key) || Promise.resolve();
  const nextPromise = currentPromise.then(() => lockPromise);
  claimLocks.set(key, nextPromise);

  return currentPromise.then(() => () => {
    release();
    if (claimLocks.get(key) === nextPromise) {
      claimLocks.delete(key);
    }
  });
}

// Helper to generate pickup codes
function generateClaimCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `FL-${num}`;
}

// SSE Clients Registry
const sseClients = new Set<Response>();

function sseBroadcast(event: RealtimeEvent) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

if (!process.env.VERCEL) {
  // Heartbeat to keep SSE connections alive
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(':keep-alive\n\n');
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);

  // Background job: automatically expire food items whose deadline has passed in PostgreSQL
  setInterval(async () => {
    try {
      const expiredRes = await query(
        `SELECT * FROM food_posts WHERE status = 'AVAILABLE' AND collection_deadline < NOW()`
      );

      if (expiredRes.rows.length > 0) {
        for (const row of expiredRes.rows) {
          await query(`UPDATE food_posts SET status = 'EXPIRED' WHERE id = $1`, [row.id]);
          const post = mapRowToFoodPost({ ...row, status: 'EXPIRED' });

          // Notify canteen authorized users
          const canteenUserRes = await query(
            `SELECT * FROM users WHERE college = $1 AND canteen_name = $2 LIMIT 1`,
            [post.collegeName, post.canteenName]
          );

          if (canteenUserRes.rows[0]) {
            const notifId = 'notif_' + crypto.randomUUID();
            await query(
              `INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
              [
                notifId,
                canteenUserRes.rows[0].id,
                post.id,
                'Food Post Expired ⏰',
                `Collection deadline has passed for "${post.foodName}". Marked as EXPIRED in PostgreSQL.`,
                'DEADLINE_WARNING',
                false,
              ]
            );
          }

          // Broadcast to clients
          sseBroadcast({
            type: 'FOOD_EXPIRED',
            foodPost: post,
            foodPostId: post.id,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Error in background expiry worker:', err);
    }
  }, 10000);
}

// ================= API ROUTES =================

// 1. SSE Stream
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(':connected\n\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Password hashing helpers
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Password is required to sign in' });
  }

  try {
    const existing = await query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email.trim()]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid credentials. No account found with this email.' });
    }

    const row = existing.rows[0];

    // If account does not have a password attached yet (legacy user), attach this password on first login
    if (!row.password_hash) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Initial password must be at least 6 characters long' });
      }
      const newHash = hashPassword(password);
      await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, row.id]);
      row.password_hash = newHash;
    } else {
      // Strictly verify that the entered password matches the account's unique password
      const isValid = verifyPassword(password, row.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect password. Please enter the unique password attached to this account.' });
      }
    }

    const user = mapRowToUser(row);
    res.json({ user, token: 'mock-jwt-token-' + user.id });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error during login' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, phone, userType, college, canteenName } = req.body;

  if (!name || !name.trim() || !email || !email.trim() || !userType || !college) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  if (!password || password.trim().length < 6) {
    return res.status(400).json({ error: 'A secure password of at least 6 characters is required for this account' });
  }

  try {
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists in PostgreSQL' });
    }

    const newId = 'usr_' + crypto.randomUUID().slice(0, 8);
    const passwordHash = hashPassword(password.trim());

    const insertRes = await query(
      `INSERT INTO users (id, name, email, password_hash, phone, user_type, college, canteen_name, is_verified, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [
        newId,
        name.trim(),
        email.trim(),
        passwordHash,
        phone || '+1 (555) 000-0000',
        userType,
        college,
        userType === 'COLLEGE' ? canteenName || `${college} Canteen` : null,
        userType === 'COLLEGE' ? false : true,
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      ]
    );

    const newUser = mapRowToUser(insertRes.rows[0]);
    res.status(201).json({ user: newUser, token: 'mock-jwt-token-' + newUser.id });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Database error during registration' });
  }
});

app.post('/api/auth/set-password', async (req: Request, res: Response) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'User ID and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    const userRes = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = userRes.rows[0];

    // If user already has a password, verify current password
    if (userRow.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Please enter your current password to change it' });
      }
      if (!verifyPassword(currentPassword, userRow.password_hash)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = hashPassword(newPassword);
    const updateRes = await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *`,
      [newHash, userId]
    );

    const updatedUser = mapRowToUser(updateRes.rows[0]);
    res.json({ 
      success: true, 
      message: userRow.password_hash ? 'Password updated successfully' : 'Password set successfully',
      user: updatedUser 
    });
  } catch (err: any) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Failed to update password in database' });
  }
});

// Google Authentication (Sign In & Sign Up)
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { email, name, avatarUrl, userType = 'USER', college = 'Stanford Central Campus', canteenName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Google email is required' });
  }

  try {
    const existing = await query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);

    if (existing.rows.length > 0) {
      // User already exists -> Log them in!
      const user = mapRowToUser(existing.rows[0]);
      if (avatarUrl && (!user.avatarUrl || user.avatarUrl.includes('unsplash'))) {
        await query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [avatarUrl, user.id]);
        user.avatarUrl = avatarUrl;
      }
      return res.json({ user, token: 'mock-jwt-token-' + user.id, isNew: false });
    }

    // User is new -> Auto Sign-Up with Google!
    const newId = 'usr_' + crypto.randomUUID().slice(0, 8);
    const resolvedName = name || email.split('@')[0] || 'Google User';
    const resolvedAvatar = avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
    const isCollege = userType === 'COLLEGE';

    const insertRes = await query(
      `INSERT INTO users (id, name, email, phone, user_type, college, canteen_name, is_verified, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        newId,
        resolvedName,
        email,
        '+1 (555) 000-0000',
        userType,
        college,
        isCollege ? canteenName || `${college} Canteen` : null,
        isCollege ? false : true,
        resolvedAvatar,
      ]
    );

    const newUser = mapRowToUser(insertRes.rows[0]);
    return res.status(201).json({ user: newUser, token: 'mock-jwt-token-' + newUser.id, isNew: true });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Database error during Google authentication', details: err.message });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const result = await query(`SELECT * FROM users ORDER BY created_at ASC`);
    res.json(result.rows.map(mapRowToUser));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users from PostgreSQL' });
  }
});

// 3. Food Posts Query
app.get('/api/food-posts', async (req: Request, res: Response) => {
  const { college, status, search } = req.query;

  try {
    let sql = `SELECT * FROM food_posts WHERE 1=1`;
    const params: any[] = [];

    if (college && college !== 'ALL' && college !== 'All Campuses') {
      params.push(college);
      sql += ` AND college_name = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      sql += ` AND (LOWER(food_name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(canteen_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY 
      CASE status 
        WHEN 'AVAILABLE' THEN 0 
        WHEN 'CLAIMED' THEN 1 
        WHEN 'COLLECTED' THEN 2 
        WHEN 'EXPIRED' THEN 3 
        ELSE 4 
      END ASC, 
      created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows.map(mapRowToFoodPost));
  } catch (err: any) {
    console.error('Error fetching food posts:', err);
    res.status(500).json({ error: 'Failed to fetch food posts from PostgreSQL' });
  }
});

app.get('/api/food-posts/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(`SELECT * FROM food_posts WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Food post not found' });
    }
    res.json(mapRowToFoodPost(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch food post from PostgreSQL' });
  }
});

app.post('/api/food-posts', async (req: Request, res: Response) => {
  const {
    foodName,
    description,
    quantity,
    servingsCount,
    availableFrom,
    collectionDeadline,
    location,
    imageUrl,
    foodSafetyInfo,
    dietaryTags,
    temperature,
    userId,
    collegeName,
    canteenName,
  } = req.body;

  if (!foodName || !description || !quantity || !collectionDeadline || !location) {
    return res.status(400).json({ error: 'Please provide all required food post details' });
  }

  try {
    if (userId) {
      const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      const user = userRes.rows[0];
      if (user && user.user_type === 'COLLEGE' && user.is_verified === false) {
        return res.status(403).json({ error: 'Your canteen account is pending admin verification before publishing food.' });
      }
    }

    const newId = 'post_' + crypto.randomUUID().slice(0, 8);
    const colId = 'col_' + crypto.randomUUID().slice(0, 6);
    const cantId = 'cant_' + crypto.randomUUID().slice(0, 6);
    const parsedServings = parseInt(servingsCount, 10) || 10;
    const finalImage = imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
    const finalAvail = availableFrom || new Date().toISOString();
    const finalSafety = foodSafetyInfo || 'Prepared fresh today. Keep refrigerated or consume within 2 hours.';
    const finalTags = Array.isArray(dietaryTags) ? dietaryTags : ['Vegetarian'];
    const finalTemp = temperature || 'HOT';

    const insertRes = await query(
      `INSERT INTO food_posts (
        id, college_id, canteen_id, college_name, canteen_name, food_name, description, quantity, servings_count,
        image_url, available_from, collection_deadline, location, status, food_safety_info, dietary_tags, temperature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'AVAILABLE', $14, $15, $16, NOW())
      RETURNING *`,
      [
        newId,
        colId,
        cantId,
        collegeName || 'Stanford Central Campus',
        canteenName || 'Campus Main Canteen',
        foodName,
        description,
        quantity,
        parsedServings,
        finalImage,
        finalAvail,
        collectionDeadline,
        location,
        finalSafety,
        JSON.stringify(finalTags),
        finalTemp,
      ]
    );

    const newPost = mapRowToFoodPost(insertRes.rows[0]);

    // Dispatch notifications to registered regular users in PostgreSQL
    const usersRes = await query(`SELECT id FROM users WHERE user_type = 'USER'`);
    for (const u of usersRes.rows) {
      await query(
        `INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          'notif_' + crypto.randomUUID(),
          u.id,
          newPost.id,
          'Surplus Food Alert! 🥗',
          `${newPost.canteenName} posted ${newPost.quantity} of ${newPost.foodName}. Claim before it is gone!`,
          'NEW_FOOD',
          false,
        ]
      );
    }

    // Broadcast SSE to all connected clients
    sseBroadcast({
      type: 'FOOD_CREATED',
      foodPost: newPost,
      foodPostId: newPost.id,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(newPost);
  } catch (err: any) {
    console.error('Error creating food post in PostgreSQL:', err);
    res.status(500).json({ error: 'Failed to create food post in PostgreSQL' });
  }
});

// ================= CRITICAL POSTGRESQL ATOMIC CLAIM TRANSACTION =================
// Enforces the single-claim rule using both an asynchronous mutex lock
// and a PostgreSQL transactional SELECT ... FOR UPDATE row-level lock.
app.post('/api/food-posts/:id/claim', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, userPhone } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required to claim food' });
  }

  // Acquire exclusive lock for this food post ID to serialize concurrent requests
  const releaseLock = await acquireLock(id);

  try {
    // 1. Begin PostgreSQL Transaction
    await pg.exec('BEGIN;');

    // 2. Row-level Lock on the food post using PostgreSQL FOR UPDATE
    const selectRes = await query(`SELECT * FROM food_posts WHERE id = $1 FOR UPDATE`, [id]);

    if (selectRes.rows.length === 0) {
      await pg.exec('ROLLBACK;');
      return res.status(404).json({ error: 'Food post not found in PostgreSQL' });
    }

    const postRow = selectRes.rows[0];

    // 3. Atomically check availability
    if (postRow.status !== 'AVAILABLE') {
      await pg.exec('ROLLBACK;');
      return res.status(409).json({
        error: 'Sorry, this food has already been claimed by another user.',
        status: postRow.status,
        claimedBy: postRow.claimant_name || 'Another student',
      });
    }

    // 4. Atomically check deadline
    const deadlineTime = new Date(postRow.collection_deadline).getTime();
    if (Date.now() > deadlineTime) {
      await query(`UPDATE food_posts SET status = 'EXPIRED' WHERE id = $1`, [id]);
      await pg.exec('COMMIT;');
      const updatedPost = mapRowToFoodPost({ ...postRow, status: 'EXPIRED' });
      sseBroadcast({
        type: 'FOOD_EXPIRED',
        foodPost: updatedPost,
        foodPostId: updatedPost.id,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: 'Sorry, the collection deadline for this food has already passed.' });
    }

    // 5. Prevent duplicate claims by same user on this post
    if (postRow.claimed_by === userId) {
      await pg.exec('ROLLBACK;');
      return res.status(400).json({ error: 'You have already claimed this food post.' });
    }

    // 6. Execute atomic update in PostgreSQL
    const claimCode = generateClaimCode();
    const nowIso = new Date().toISOString();

    const updateRes = await query(
      `UPDATE food_posts 
       SET status = 'CLAIMED', claimed_by = $1, claimant_name = $2, claimant_phone = $3, claim_code = $4, claimed_at = $5
       WHERE id = $6
       RETURNING *`,
      [userId, userName || 'Student', userPhone || '', claimCode, nowIso, id]
    );

    const updatedPost = mapRowToFoodPost(updateRes.rows[0]);

    // 7. Insert claim record into PostgreSQL
    const claimId = 'claim_' + crypto.randomUUID().slice(0, 8);
    const insertClaimRes = await query(
      `INSERT INTO claims (id, food_post_id, user_id, user_name, user_phone, status, claim_code, claimed_at)
       VALUES ($1, $2, $3, $4, $5, 'CLAIMED', $6, $7)
       RETURNING *`,
      [claimId, id, userId, updatedPost.claimantName || 'Student', updatedPost.claimantPhone || '', claimCode, nowIso]
    );

    const claim = mapRowToClaim(insertClaimRes.rows[0]);

    // 8. Insert Notification for student
    await query(
      `INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
       VALUES ($1, $2, $3, $4, $5, 'CLAIM_SUCCESS', FALSE, NOW())`,
      [
        'notif_' + crypto.randomUUID(),
        userId,
        updatedPost.id,
        'Claim Confirmed! 🎉',
        `You successfully reserved ${updatedPost.foodName} from ${updatedPost.canteenName}. Show pickup code ${claimCode} at the counter.`,
      ]
    );

    // 9. Insert Notification for canteen operator
    const canteenUserRes = await query(
      `SELECT id FROM users WHERE college = $1 AND canteen_name = $2 LIMIT 1`,
      [updatedPost.collegeName, updatedPost.canteenName]
    );
    if (canteenUserRes.rows[0]) {
      await query(
        `INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
         VALUES ($1, $2, $3, $4, $5, 'FOOD_CLAIMED', FALSE, NOW())`,
        [
          'notif_' + crypto.randomUUID(),
          canteenUserRes.rows[0].id,
          updatedPost.id,
          'New Food Claim! 📋',
          `${updatedPost.claimantName} just claimed "${updatedPost.foodName}" (${updatedPost.quantity}). Pickup code: ${claimCode}.`,
        ]
      );
    }

    // 10. Commit PostgreSQL Transaction
    await pg.exec('COMMIT;');

    // Broadcast SSE update
    sseBroadcast({
      type: 'FOOD_CLAIMED',
      foodPost: updatedPost,
      foodPostId: updatedPost.id,
      claimedBy: userId,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Food successfully claimed via PostgreSQL transaction!',
      foodPost: updatedPost,
      claim,
    });
  } catch (err: any) {
    await pg.exec('ROLLBACK;').catch(() => {});
    console.error('Error claiming food in PostgreSQL:', err);
    return res.status(500).json({ error: 'Internal server error while claiming food in PostgreSQL' });
  } finally {
    releaseLock();
  }
});

// Mark food as collected after handover
app.post('/api/food-posts/:id/collect', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { verifiedCode } = req.body;

  try {
    const postRes = await query(`SELECT * FROM food_posts WHERE id = $1`, [id]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Food post not found' });
    }

    const post = mapRowToFoodPost(postRes.rows[0]);
    if (post.status !== 'CLAIMED') {
      return res.status(400).json({ error: `Cannot collect food with status ${post.status}` });
    }

    if (verifiedCode && post.claimCode && verifiedCode.trim().toUpperCase() !== post.claimCode.trim().toUpperCase()) {
      return res.status(400).json({ error: `Invalid collection code. Expected ${post.claimCode}` });
    }

    const nowIso = new Date().toISOString();
    const updateRes = await query(
      `UPDATE food_posts SET status = 'COLLECTED', collected_at = $1 WHERE id = $2 RETURNING *`,
      [nowIso, id]
    );

    // Update claim status
    await query(
      `UPDATE claims SET status = 'COLLECTED', collected_at = $1 WHERE food_post_id = $2 AND status = 'CLAIMED'`,
      [nowIso, id]
    );

    const updatedPost = mapRowToFoodPost(updateRes.rows[0]);

    // Notify claimant
    if (updatedPost.claimedBy) {
      await query(
        `INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
         VALUES ($1, $2, $3, $4, $5, 'FOOD_COLLECTED', FALSE, NOW())`,
        [
          'notif_' + crypto.randomUUID(),
          updatedPost.claimedBy,
          updatedPost.id,
          'Handover Completed! 🍽️',
          `Your pickup for ${updatedPost.foodName} has been verified by the canteen. Enjoy your meal and thank you for saving food waste!`,
        ]
      );
    }

    sseBroadcast({
      type: 'FOOD_COLLECTED',
      foodPost: updatedPost,
      foodPostId: updatedPost.id,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, foodPost: updatedPost });
  } catch (err: any) {
    console.error('Error marking collected in PostgreSQL:', err);
    res.status(500).json({ error: 'Database error marking food collected' });
  }
});

// Cancel a food post
app.post('/api/food-posts/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const postRes = await query(`SELECT * FROM food_posts WHERE id = $1`, [id]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Food post not found' });
    }

    const previousPost = mapRowToFoodPost(postRes.rows[0]);
    const cancelReason = reason || 'Post cancelled by canteen.';
    const nowIso = new Date().toISOString();

    const updateRes = await query(
      `UPDATE food_posts SET status = 'CANCELLED', cancelled_at = $1, cancellation_reason = $2 WHERE id = $3 RETURNING *`,
      [nowIso, cancelReason, id]
    );

    if (previousPost.status === 'CLAIMED' && previousPost.claimedBy) {
      await query(`UPDATE claims SET status = 'CANCELLED' WHERE food_post_id = $1 AND status = 'CLAIMED'`, [id]);
      await query(
        `INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
         VALUES ($1, $2, $3, $4, $5, 'CLAIM_CANCELLED', FALSE, NOW())`,
        [
          'notif_' + crypto.randomUUID(),
          previousPost.claimedBy,
          previousPost.id,
          'Claim Cancelled by Canteen ⚠️',
          `We regret that the post for "${previousPost.foodName}" was cancelled: ${cancelReason}`,
        ]
      );
    }

    const updatedPost = mapRowToFoodPost(updateRes.rows[0]);

    sseBroadcast({
      type: 'FOOD_CANCELLED',
      foodPost: updatedPost,
      foodPostId: updatedPost.id,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, foodPost: updatedPost });
  } catch (err: any) {
    console.error('Error cancelling food post in PostgreSQL:', err);
    res.status(500).json({ error: 'Database error cancelling food post' });
  }
});

// Release / Unclaim by the user
app.post('/api/food-posts/:id/unclaim', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  const releaseLock = await acquireLock(id);

  try {
    const postRes = await query(`SELECT * FROM food_posts WHERE id = $1`, [id]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Food post not found' });
    }

    const post = mapRowToFoodPost(postRes.rows[0]);
    if (post.claimedBy !== userId) {
      return res.status(403).json({ error: 'You did not claim this food item.' });
    }

    if (post.status !== 'CLAIMED') {
      return res.status(400).json({ error: 'Cannot cancel claim for non-claimed food item.' });
    }

    const updateRes = await query(
      `UPDATE food_posts 
       SET status = 'AVAILABLE', claimed_by = NULL, claimant_name = NULL, claimant_phone = NULL, claim_code = NULL, claimed_at = NULL
       WHERE id = $1 RETURNING *`,
      [id]
    );

    await query(`UPDATE claims SET status = 'CANCELLED' WHERE food_post_id = $1 AND status = 'CLAIMED'`, [id]);

    const updatedPost = mapRowToFoodPost(updateRes.rows[0]);

    sseBroadcast({
      type: 'FOOD_CREATED',
      foodPost: updatedPost,
      foodPostId: updatedPost.id,
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Claim released successfully in PostgreSQL. Food is available again.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to release claim in PostgreSQL' });
  } finally {
    releaseLock();
  }
});

// 4. Concurrency & Race Condition Simulation API backed by PostgreSQL
app.post('/api/test/race-condition', async (req: Request, res: Response) => {
  const { foodPostId } = req.body;

  try {
    let targetRow: any = null;

    if (foodPostId) {
      const res = await query(`SELECT * FROM food_posts WHERE id = $1`, [foodPostId]);
      if (res.rows[0]) targetRow = res.rows[0];
    }

    if (!targetRow) {
      const res = await query(`SELECT * FROM food_posts WHERE status = 'AVAILABLE' LIMIT 1`);
      if (res.rows[0]) targetRow = res.rows[0];
    }

    if (!targetRow) {
      const testId = 'post_race_' + crypto.randomUUID().slice(0, 6);
      const res = await query(
        `INSERT INTO food_posts (
          id, college_id, canteen_id, college_name, canteen_name, food_name, description, quantity, servings_count,
          image_url, available_from, collection_deadline, location, status, food_safety_info, dietary_tags, temperature, created_at
        ) VALUES (
          $1, 'col_stanford', 'cant_tresidder', 'Stanford Central Campus', 'Tresidder Student Dining Hall',
          'Race Condition Test: Surplus Biryani Box', 'Test dish for verifying concurrent claim mutex logic under load.',
          '1 portion', 1, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
          NOW(), NOW() + INTERVAL '1 hour', 'Dining Counter #1', 'AVAILABLE', 'Simulation item for PostgreSQL concurrency audit.',
          '["Vegetarian"]'::jsonb, 'HOT', NOW()
        ) RETURNING *`,
        [testId]
      );
      targetRow = res.rows[0];
    } else {
      await query(
        `UPDATE food_posts SET status = 'AVAILABLE', claimed_by = NULL, claimant_name = NULL, claim_code = NULL, claimed_at = NULL WHERE id = $1`,
        [targetRow.id]
      );
    }

    const simulatedStudents = [
      { id: 'sim_user_1', name: 'Student 1 (Jordan)', email: 'jordan.sim@campus.edu' },
      { id: 'sim_user_2', name: 'Student 2 (Elena)', email: 'elena.sim@campus.edu' },
      { id: 'sim_user_3', name: 'Student 3 (Kwame)', email: 'kwame.sim@campus.edu' },
      { id: 'sim_user_4', name: 'Student 4 (Mei)', email: 'mei.sim@campus.edu' },
      { id: 'sim_user_5', name: 'Student 5 (Liam)', email: 'liam.sim@campus.edu' },
    ];

    // Ensure simulated users exist in PostgreSQL to satisfy foreign key constraint on claimed_by
    for (const s of simulatedStudents) {
      await query(
        `INSERT INTO users (id, name, email, user_type, college)
         VALUES ($1, $2, $3, 'USER', 'Stanford Central Campus')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.email]
      );
    }

    const startTime = Date.now();

    // Fire all 5 requests concurrently into PostgreSQL
    const claimPromises = simulatedStudents.map(async (student) => {
      const releaseLock = await acquireLock(targetRow.id);
      try {
        await pg.exec('BEGIN;');
        const checkRes = await query(`SELECT status FROM food_posts WHERE id = $1 FOR UPDATE`, [targetRow.id]);
        if (!checkRes.rows[0] || checkRes.rows[0].status !== 'AVAILABLE') {
          await pg.exec('ROLLBACK;');
          return {
            studentName: student.name,
            studentId: student.id,
            success: false,
            httpStatus: 409,
            response: 'Sorry, this food has already been claimed by another user.',
          };
        }

        const code = generateClaimCode();
        await query(
          `UPDATE food_posts SET status = 'CLAIMED', claimed_by = $1, claimant_name = $2, claim_code = $3, claimed_at = NOW() WHERE id = $4`,
          [student.id, student.name, code, targetRow.id]
        );
        await pg.exec('COMMIT;');

        return {
          studentName: student.name,
          studentId: student.id,
          success: true,
          httpStatus: 200,
          response: `Successfully claimed in PostgreSQL! Claim Code: ${code}`,
        };
      } catch (err: any) {
        await pg.exec('ROLLBACK;').catch(() => {});
        return {
          studentName: student.name,
          studentId: student.id,
          success: false,
          httpStatus: 500,
          response: err.message,
        };
      } finally {
        releaseLock();
      }
    });

    const results = await Promise.all(claimPromises);
    const durationMs = Date.now() - startTime;

    const successfulClaims = results.filter((r) => r.success);
    const rejectedClaims = results.filter((r) => !r.success);

    const updatedTargetRes = await query(`SELECT * FROM food_posts WHERE id = $1`, [targetRow.id]);
    const finalPost = mapRowToFoodPost(updatedTargetRes.rows[0]);

    sseBroadcast({
      type: 'FOOD_CLAIMED',
      foodPost: finalPost,
      foodPostId: finalPost.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      testPassed: successfulClaims.length === 1 && rejectedClaims.length === 4,
      foodItem: finalPost.foodName,
      foodPostId: finalPost.id,
      durationMs,
      winner: successfulClaims[0]?.studentName || 'None',
      successfulCount: successfulClaims.length,
      rejectedCount: rejectedClaims.length,
      detailedResults: results,
      databaseEngine: 'PostgreSQL (Local Relational Engine)',
    });
  } catch (err: any) {
    console.error('Error during concurrency test:', err);
    res.status(500).json({ error: 'PostgreSQL race condition test failed: ' + err.message });
  }
});

// 5. Notifications Query
app.get('/api/notifications', async (req: Request, res: Response) => {
  const { userId } = req.query;
  try {
    let sql = `SELECT * FROM notifications`;
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      sql += ` WHERE user_id = $1`;
    }
    sql += ` ORDER BY created_at DESC LIMIT 30`;
    const result = await query(sql, params);
    res.json(result.rows.map(mapRowToNotification));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications from PostgreSQL' });
  }
});

app.post('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification in PostgreSQL' });
  }
});

app.post('/api/notifications/mark-all-read', async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    if (userId) {
      await query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read in PostgreSQL' });
  }
});

// 6. User Claims Query
app.get('/api/claims/my-claims', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await query(
      `SELECT * FROM food_posts WHERE claimed_by = $1 ORDER BY claimed_at DESC`,
      [userId]
    );
    res.json(result.rows.map(mapRowToFoodPost));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims from PostgreSQL' });
  }
});

// 7. Canteen / College verification & Dashboard stats via PostgreSQL Aggregates
app.get('/api/stats', async (req: Request, res: Response) => {
  const { collegeName, canteenName } = req.query;

  try {
    let filterClause = 'WHERE 1=1';
    const params: any[] = [];

    if (collegeName && collegeName !== 'ALL' && collegeName !== 'All Campuses') {
      params.push(collegeName);
      filterClause += ` AND college_name = $${params.length}`;
    }

    if (canteenName) {
      params.push(canteenName);
      filterClause += ` AND canteen_name = $${params.length}`;
    }

    const countsRes = await query(
      `SELECT 
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE status = 'COLLECTED') as collected_posts,
        COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_posts,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available_posts,
        COALESCE(SUM(servings_count) FILTER (WHERE status IN ('COLLECTED', 'CLAIMED')), 0) as redistributed_servings
       FROM food_posts ${filterClause}`,
      params
    );

    const row = countsRes.rows[0] || {};
    const totalFoodPosts = parseInt(row.total_posts || '0', 10);
    const foodSuccessfullyCollected = parseInt(row.collected_posts || '0', 10);
    const expiredPosts = parseInt(row.expired_posts || '0', 10);
    const activeAvailablePosts = parseInt(row.available_posts || '0', 10);
    const portionsRedistributed = parseInt(row.redistributed_servings || '0', 10);

    const co2SavedKg = Math.round(portionsRedistributed * 0.85 * 10) / 10;
    const mealsSaved = portionsRedistributed;

    const stats: DashboardStats = {
      totalFoodPosts,
      portionsRedistributed,
      foodSuccessfullyCollected,
      expiredPosts,
      activeAvailablePosts,
      co2SavedKg,
      mealsSaved,
    };

    res.json(stats);
  } catch (err) {
    console.error('Error calculating PostgreSQL stats:', err);
    res.status(500).json({ error: 'Failed to calculate stats from PostgreSQL' });
  }
});

// Toggle college verification
app.post('/api/users/:id/verify-canteen', async (req: Request, res: Response) => {
  try {
    const updateRes = await query(
      `UPDATE users SET is_verified = NOT is_verified WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in PostgreSQL' });
    }
    res.json({ success: true, user: mapRowToUser(updateRes.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle verification in PostgreSQL' });
  }
});

// Reset demo data in PostgreSQL
app.post('/api/reset-demo', async (req: Request, res: Response) => {
  res.status(403).json({ error: 'Reset demo is disabled for live databases.' });
});

// ================= SERVER STARTUP =================
async function startServer() {
  await initPostgres();

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Foodlink server with local PostgreSQL database listening on port ${PORT}`);
    });
  }
}

// Add an endpoint to manually initialize the DB on Vercel
app.get('/api/init-db', async (req: Request, res: Response) => {
  try {
    await initPostgres();
    res.json({ success: true, message: 'Database initialized and seeded successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to init DB', message: err.message });
  }
});

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start Foodlink server:', err);
  });
}

export default app;
