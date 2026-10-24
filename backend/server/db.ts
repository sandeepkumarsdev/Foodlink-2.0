
import pgDriver from 'pg';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { User, FoodPost, Claim, NotificationItem } from '../types/index.js';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
}

let dbClient: DbClient;
export let isVercelPostgres = false;

const connectionString = process.env.POSTGRES_URL || "postgresql://neondb_owner:npg_7oaDdi8tNLwB@ep-autumn-surf-b8uj6j1j-pooler.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require";

if (connectionString) {
  isVercelPostgres = true;
  // Use a Pool with max: 1 to ensure transaction state (BEGIN/COMMIT) works as expected 
  // since server.ts uses pg.exec('BEGIN') and query() sequentially, while allowing auto-reconnects.
  const pool = new pgDriver.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
    query_timeout: 15000
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected error on idle Postgres client', err);
  });
  
  dbClient = {
    query: async (sql, params) => {
      const res = await pool.query(sql, params);
      return { rows: res.rows };
    },
    exec: async (sql) => {
      await pool.query(sql);
    }
  };
} else {
  if (process.env.VERCEL) {
    console.warn('WARNING: POSTGRES_URL is missing in Vercel. Falling back to an ephemeral in-memory PGlite database for demonstration purposes.');
    let pgliteInstance: any = null;
    let isReady = false;
    let initQueue: Array<(val?: any) => void> = [];

    const ensureDb = async () => {
      if (isReady) return pgliteInstance;
      if (pgliteInstance) {
        return new Promise<any>(resolve => {
          initQueue.push(() => resolve(pgliteInstance));
        });
      }
      
      const { PGlite } = await import('@electric-sql/pglite');
      pgliteInstance = new PGlite();
      
      try {
        await pgliteInstance.exec(`
          CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT, phone TEXT, user_type TEXT NOT NULL CHECK (user_type IN ('USER', 'COLLEGE', 'ADMIN')), college TEXT NOT NULL, canteen_name TEXT, is_verified BOOLEAN DEFAULT FALSE, avatar_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS food_posts (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, canteen_id TEXT NOT NULL, college_name TEXT NOT NULL, canteen_name TEXT NOT NULL, food_name TEXT NOT NULL, description TEXT NOT NULL, quantity TEXT NOT NULL, servings_count INTEGER DEFAULT 10, image_url TEXT NOT NULL, available_from TIMESTAMPTZ NOT NULL, collection_deadline TIMESTAMPTZ NOT NULL, location TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'CLAIMED', 'COLLECTED', 'EXPIRED', 'CANCELLED')), claimed_by TEXT REFERENCES users(id), claimant_name TEXT, claimant_phone TEXT, claim_code TEXT, claimed_at TIMESTAMPTZ, collected_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, cancellation_reason TEXT, food_safety_info TEXT NOT NULL, dietary_tags JSONB DEFAULT '[]'::jsonb, temperature TEXT CHECK (temperature IN ('HOT', 'COLD', 'ROOM_TEMP')), created_at TIMESTAMPTZ DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, food_post_id TEXT NOT NULL REFERENCES food_posts(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), user_name TEXT NOT NULL, user_phone TEXT, status TEXT NOT NULL CHECK (status IN ('CLAIMED', 'COLLECTED', 'CANCELLED')), claim_code TEXT NOT NULL, claimed_at TIMESTAMPTZ DEFAULT NOW(), collected_at TIMESTAMPTZ);
          CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), food_post_id TEXT REFERENCES food_posts(id) ON DELETE SET NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL, read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
        `);
        isReady = true;
        await seedPostgresData();
      } catch (err) {
        console.error("Failed to init in-memory DB", err);
      }
      
      for (const resolve of initQueue) resolve(pgliteInstance);
      initQueue = [];
      
      return pgliteInstance;
    };

    dbClient = {
      query: async (sql, params) => {
        const db = await ensureDb();
        return (params !== undefined ? db.query(sql, params) : db.query(sql)) as any;
      },
      exec: async (sql) => {
        const db = await ensureDb();
        await db.exec(sql);
      }
    };
  } else {
    const DATA_DIR = path.resolve(process.cwd(), 'data');
    const PG_DATA_DIR = path.join(DATA_DIR, 'pgdata');

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let pgliteInstance: any;
    dbClient = {
      query: async (sql, params) => {
        if (!pgliteInstance) {
          const { PGlite } = await import('@electric-sql/pglite');
          pgliteInstance = new PGlite(PG_DATA_DIR);
        }
        return (params !== undefined ? pgliteInstance.query(sql, params) : pgliteInstance.query(sql)) as any;
      },
      exec: async (sql) => {
        if (!pgliteInstance) {
          const { PGlite } = await import('@electric-sql/pglite');
          pgliteInstance = new PGlite(PG_DATA_DIR);
        }
        await pgliteInstance.exec(sql);
      }
    };
  }
}

// Persistent Local or Remote PostgreSQL Instance
export const pg = dbClient;

export async function query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  return dbClient.query<T>(sql, params);
}

export async function initPostgres() {
  if (isVercelPostgres) {
    console.log('Initializing Vercel PostgreSQL database...');
  } else {
    console.log('Initializing local PostgreSQL database at: data/pgdata');
  }

  // 1. Create Tables
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      phone TEXT,
      user_type TEXT NOT NULL CHECK (user_type IN ('USER', 'COLLEGE', 'ADMIN')),
      college TEXT NOT NULL,
      canteen_name TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS food_posts (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      canteen_id TEXT NOT NULL,
      college_name TEXT NOT NULL,
      canteen_name TEXT NOT NULL,
      food_name TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity TEXT NOT NULL,
      servings_count INTEGER DEFAULT 10,
      image_url TEXT NOT NULL,
      available_from TIMESTAMPTZ NOT NULL,
      collection_deadline TIMESTAMPTZ NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'CLAIMED', 'COLLECTED', 'EXPIRED', 'CANCELLED')),
      claimed_by TEXT REFERENCES users(id),
      claimant_name TEXT,
      claimant_phone TEXT,
      claim_code TEXT,
      claimed_at TIMESTAMPTZ,
      collected_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      food_safety_info TEXT NOT NULL,
      dietary_tags JSONB DEFAULT '[]'::jsonb,
      temperature TEXT CHECK (temperature IN ('HOT', 'COLD', 'ROOM_TEMP')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      food_post_id TEXT NOT NULL REFERENCES food_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      user_name TEXT NOT NULL,
      user_phone TEXT,
      status TEXT NOT NULL CHECK (status IN ('CLAIMED', 'COLLECTED', 'CANCELLED')),
      claim_code TEXT NOT NULL,
      claimed_at TIMESTAMPTZ DEFAULT NOW(),
      collected_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      food_post_id TEXT REFERENCES food_posts(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_food_posts_status ON food_posts(status);
    CREATE INDEX IF NOT EXISTS idx_food_posts_college ON food_posts(college_name);
    CREATE INDEX IF NOT EXISTS idx_claims_post ON claims(food_post_id);
    CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id);

    -- Ensure password_hash column exists on existing deployed databases
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

    -- Attach default password (Password123!) to demo accounts if not set
    UPDATE users SET password_hash = 'd658306858b7c961c0b0c5260cf6c255:4b36d650b0a30499ab4e8d8e29d82a51cefecce1476243f0b5f38e4f0cbd47cdbcf83ecac5897d95149ba506a597e95483f4c07ce7c168eab536583746ed4b16'
    WHERE password_hash IS NULL AND email IN ('alex.student@campus.edu', 'sarah.c@campus.edu', 'chef.marco@campus.edu', 'priya.catering@campus.edu', 'admin@foodlink.edu');
  `);

  // Check if users table is populated; if not, seed initial data
  const userCountRes = await pg.query<{ count: string }>('SELECT COUNT(*) as count FROM users');
  const count = parseInt(userCountRes.rows[0]?.count || '0', 10);

  if (count === 0) {
    console.log('Seeding initial Postgres campus data...');
    await seedPostgresData();
  } else {
    console.log(`Local PostgreSQL ready with ${count} users.`);
  }
}

export async function seedPostgresData() {
  const now = new Date();
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const inThreeHours = new Date(now.getTime() + 3.5 * 60 * 60 * 1000).toISOString();
  const inFiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();
  const inSixHours = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const pastOneHour = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
  const pastThreeHours = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

  // Clear existing data cleanly in transaction
  await pg.exec(`
    TRUNCATE TABLE notifications CASCADE;
    TRUNCATE TABLE claims CASCADE;
    TRUNCATE TABLE food_posts CASCADE;
    TRUNCATE TABLE users CASCADE;
  `);

  const demoPassHash = 'd658306858b7c961c0b0c5260cf6c255:4b36d650b0a30499ab4e8d8e29d82a51cefecce1476243f0b5f38e4f0cbd47cdbcf83ecac5897d95149ba506a597e95483f4c07ce7c168eab536583746ed4b16';

  // Seed Users
  await pg.query(`
    INSERT INTO users (id, name, email, password_hash, phone, user_type, college, canteen_name, is_verified, avatar_url, created_at)
    VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
    ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22),
    ($23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33),
    ($34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44),
    ($45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55)
  `, [
    'usr_student_alex', 'Alex Rivera', 'alex.student@campus.edu', demoPassHash, '+1 (555) 234-5678', 'USER', 'Stanford Central Campus', null, false, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', new Date(now.getTime() - 86400000 * 10).toISOString(),
    'usr_student_sarah', 'Sarah Chen', 'sarah.c@campus.edu', demoPassHash, '+1 (555) 345-6789', 'USER', 'Stanford Central Campus', null, false, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', new Date(now.getTime() - 86400000 * 8).toISOString(),
    'usr_canteen_chef_marco', 'Chef Marco Rossi', 'chef.marco@campus.edu', demoPassHash, '+1 (555) 789-0123', 'COLLEGE', 'Stanford Central Campus', 'Tresidder Student Dining Hall', true, 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80', new Date(now.getTime() - 86400000 * 30).toISOString(),
    'usr_canteen_priya', 'Priya Sharma (Catering Dir.)', 'priya.catering@campus.edu', demoPassHash, '+1 (555) 890-1234', 'COLLEGE', 'UC Berkeley Campus', 'Crossroads Dining Commons', true, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', new Date(now.getTime() - 86400000 * 20).toISOString(),
    'usr_admin', 'Foodlink Campus Admin', 'admin@foodlink.edu', demoPassHash, '+1 (555) 999-0000', 'ADMIN', 'System-wide Admin', null, true, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', new Date(now.getTime() - 86400000 * 60).toISOString(),
  ]);

  // Seed Food Posts
  await pg.query(`
    INSERT INTO food_posts (
      id, college_id, canteen_id, college_name, canteen_name, food_name, description, quantity, servings_count,
      image_url, available_from, collection_deadline, location, status, food_safety_info, dietary_tags, temperature,
      claimed_by, claimant_name, claimant_phone, claim_code, claimed_at, collected_at, created_at
    ) VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24),
    ($25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48),
    ($49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72),
    ($73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96),
    ($97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118, $119, $120)
  `, [
    // 1. Lemon Rice (AVAILABLE)
    'post_lemon_rice', 'col_stanford', 'cant_tresidder', 'Stanford Central Campus', 'Tresidder Student Dining Hall',
    'Fragrant Lemon Herb Rice & Dal', 'Freshly prepared South Asian style lemon rice with mustard seeds, roasted cashews, and rich yellow lentil tadka. Packaged in sanitized hot-food takeout containers from lunch service.',
    '20 portions', 20, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80',
    new Date(now.getTime() - 15 * 60 * 1000).toISOString(), inTwoHours,
    'Tresidder Memorial Union, 2nd Floor Dining Counter #3 (Ask for Chef Marco)', 'AVAILABLE',
    'Prepared at 11:30 AM today in our certified commercial kitchen. Kept in warm holding at 65°C. Safe to consume within 3 hours or refrigerate immediately.',
    JSON.stringify(['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal-Friendly']), 'HOT',
    null, null, null, null, null, null, new Date(now.getTime() - 20 * 60 * 1000).toISOString(),

    // 2. Sandwiches (AVAILABLE)
    'post_artisan_sandwiches', 'col_stanford', 'cant_tresidder', 'Stanford Central Campus', 'Tresidder Student Dining Hall',
    'Gourmet Baguette Sandwiches & Salad Box', 'Assortment of freshly assembled sandwiches from today\'s academic conference catering: Roasted Mediterranean Veggie & Pesto, Smoked Turkey Breast with Swiss, and Caprese Ciabatta.',
    '15 meal boxes', 15, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    new Date(now.getTime() - 30 * 60 * 1000).toISOString(), inThreeHours,
    'Faculty Club Catering Dispatch, Ground Floor Service Bay', 'AVAILABLE',
    'Sealed individually in compostable boxes with ice-pack chilled transport. Consume by tonight.',
    JSON.stringify(['Vegetarian Option', 'Halal-Friendly']), 'COLD',
    null, null, null, null, null, null, new Date(now.getTime() - 35 * 60 * 1000).toISOString(),

    // 3. Pasta Primavera (AVAILABLE)
    'post_pasta_primavera', 'col_berkeley', 'cant_crossroads', 'UC Berkeley Campus', 'Crossroads Dining Commons',
    'Penne Pasta Primavera with Garlic Focaccia', 'Penne tossed with sautéed zucchini, cherry tomatoes, baby spinach, basil pesto, and parmesan. Served with warm garlic herb bread.',
    '25 servings', 25, 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
    new Date(now.getTime() - 10 * 60 * 1000).toISOString(), inFiveHours,
    'Crossroads Main Hall, North Pickup Station by the green recycle banner', 'AVAILABLE',
    'Fresh from lunchtime hotline at 12:00 PM. Kept under commercial heating.',
    JSON.stringify(['Vegetarian', 'Nut-Free']), 'HOT',
    null, null, null, null, null, null, new Date(now.getTime() - 15 * 60 * 1000).toISOString(),

    // 4. Roast Chicken (CLAIMED by Alex)
    'post_roast_chicken', 'col_stanford', 'cant_tresidder', 'Stanford Central Campus', 'Tresidder Student Dining Hall',
    'Rosemary Garlic Roasted Chicken & Wedges', 'Tender chicken quarters slow-roasted with fresh rosemary, whole garlic cloves, served with golden potato wedges and steamed green beans.',
    '18 portions', 18, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
    new Date(now.getTime() - 40 * 60 * 1000).toISOString(), inSixHours,
    'Tresidder Kitchen Back Entrance, Loading Gate 2', 'CLAIMED',
    'Fully cooked to internal temp 78°C. Securely packed in insulated thermal bags ready for student pickup.',
    JSON.stringify(['High-Protein', 'Gluten-Free', 'Halal-Friendly']), 'HOT',
    'usr_student_alex', 'Alex Rivera', '+1 (555) 234-5678', 'FL-8241', new Date(now.getTime() - 10 * 60 * 1000).toISOString(), null, new Date(now.getTime() - 45 * 60 * 1000).toISOString(),

    // 5. Pastries (COLLECTED by Sarah)
    'post_fruit_pastries', 'col_berkeley', 'cant_crossroads', 'UC Berkeley Campus', 'Crossroads Dining Commons',
    'Morning Bakery Pastries & Fresh Fruit Bowls', 'Assorted croissants, blueberry muffins, cinnamon scrolls, and individual melon-berry fruit cups left over from breakfast seminar.',
    '30 items', 30, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), pastOneHour,
    'Crossroads Cafe Counter', 'COLLECTED',
    'Baked this morning at 6:00 AM. Stored at clean ambient temperature.',
    JSON.stringify(['Vegetarian']), 'ROOM_TEMP',
    'usr_student_sarah', 'Sarah Chen', '+1 (555) 345-6789', 'FL-3190', pastThreeHours, new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(), new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
  ]);

  // Seed Claims
  await pg.query(`
    INSERT INTO claims (id, food_post_id, user_id, user_name, user_phone, status, claim_code, claimed_at, collected_at)
    VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9),
    ($10, $11, $12, $13, $14, $15, $16, $17, $18)
  `, [
    'claim_alex_chicken', 'post_roast_chicken', 'usr_student_alex', 'Alex Rivera', '+1 (555) 234-5678', 'CLAIMED', 'FL-8241', new Date(now.getTime() - 10 * 60 * 1000).toISOString(), null,
    'claim_sarah_bakery', 'post_fruit_pastries', 'usr_student_sarah', 'Sarah Chen', '+1 (555) 345-6789', 'COLLECTED', 'FL-3190', pastThreeHours, new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
  ]);

  // Seed Notifications
  await pg.query(`
    INSERT INTO notifications (id, user_id, food_post_id, title, message, type, read, created_at)
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8),
    ($9, $10, $11, $12, $13, $14, $15, $16),
    ($17, $18, $19, $20, $21, $22, $23, $24)
  `, [
    'notif_1', 'usr_student_alex', 'post_roast_chicken', 'Claim Confirmed! 🎉',
    'You successfully reserved Rosemary Garlic Roasted Chicken. Please collect before the deadline using code FL-8241.',
    'CLAIM_SUCCESS', false, new Date(now.getTime() - 10 * 60 * 1000).toISOString(),

    'notif_2', 'usr_canteen_chef_marco', 'post_roast_chicken', 'New Food Claim! 📋',
    'Alex Rivera has claimed your surplus Roasted Chicken post (18 portions). Collection code: FL-8241.',
    'FOOD_CLAIMED', false, new Date(now.getTime() - 10 * 60 * 1000).toISOString(),

    'notif_3', 'usr_student_alex', 'post_lemon_rice', 'New Surplus Food Near You 🍲',
    'Tresidder Student Dining Hall just posted 20 portions of Fragrant Lemon Herb Rice & Dal.',
    'NEW_FOOD', true, new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
  ]);

  console.log('Postgres seeded successfully with users, food_posts, claims, and notifications.');
}

// Data Mapping Utilities between Postgres snake_case and TypeScript camelCase
export function mapRowToUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || '',
    userType: r.user_type,
    college: r.college,
    canteenName: r.canteen_name || undefined,
    isVerified: r.is_verified,
    avatarUrl: r.avatar_url,
    hasPassword: Boolean(r.password_hash),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export function mapRowToFoodPost(r: any): FoodPost {
  let dietaryTags: string[] = [];
  if (Array.isArray(r.dietary_tags)) {
    dietaryTags = r.dietary_tags;
  } else if (typeof r.dietary_tags === 'string') {
    try {
      dietaryTags = JSON.parse(r.dietary_tags);
    } catch {
      dietaryTags = [r.dietary_tags];
    }
  }

  return {
    id: r.id,
    collegeId: r.college_id,
    canteenId: r.canteen_id,
    collegeName: r.college_name,
    canteenName: r.canteen_name,
    foodName: r.food_name,
    description: r.description,
    quantity: r.quantity,
    servingsCount: r.servings_count || 10,
    imageUrl: r.image_url,
    availableFrom: new Date(r.available_from).toISOString(),
    collectionDeadline: new Date(r.collection_deadline).toISOString(),
    location: r.location,
    status: r.status,
    claimedBy: r.claimed_by || undefined,
    claimantName: r.claimant_name || undefined,
    claimantPhone: r.claimant_phone || undefined,
    claimCode: r.claim_code || undefined,
    claimedAt: r.claimed_at ? new Date(r.claimed_at).toISOString() : undefined,
    collectedAt: r.collected_at ? new Date(r.collected_at).toISOString() : undefined,
    cancelledAt: r.cancelled_at ? new Date(r.cancelled_at).toISOString() : undefined,
    cancellationReason: r.cancellation_reason || undefined,
    foodSafetyInfo: r.food_safety_info,
    dietaryTags,
    temperature: r.temperature || undefined,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export function mapRowToNotification(r: any): NotificationItem {
  return {
    id: r.id,
    userId: r.user_id,
    foodPostId: r.food_post_id || undefined,
    title: r.title,
    message: r.message,
    type: r.type,
    read: Boolean(r.read),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export function mapRowToClaim(r: any): Claim {
  return {
    id: r.id,
    foodPostId: r.food_post_id,
    userId: r.user_id,
    userName: r.user_name,
    userPhone: r.user_phone || '',
    status: r.status,
    claimCode: r.claim_code,
    claimedAt: new Date(r.claimed_at).toISOString(),
    collectedAt: r.collected_at ? new Date(r.collected_at).toISOString() : undefined,
  };
}
