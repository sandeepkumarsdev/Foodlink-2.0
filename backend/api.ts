import app, { ensureDbInitialized } from './app.js';

export default async function handler(req: any, res: any) {
  // If Vercel rewrote /api/... to /api/index, restore the original URL from headers
  const original = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
  if (original && (req.url === '/api' || req.url === '/api/index')) {
    req.url = original;
  }
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  try {
    await ensureDbInitialized();
  } catch (err: any) {
    console.error('Database connection error in Vercel serverless function:', err);
    return res.status(500).json({
      error: 'Database connection failed. Please ensure POSTGRES_URL environment variable is set in your Vercel Project Settings.',
      details: err.message,
    });
  }

  return app(req, res);
}
