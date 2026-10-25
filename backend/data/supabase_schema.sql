-- FoodLink Database Schema for Supabase

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('USER', 'COLLEGE', 'ADMIN')),
  college TEXT NOT NULL,
  canteen_name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Food Posts table
CREATE TABLE IF NOT EXISTS public.food_posts (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  canteen_id TEXT NOT NULL,
  college_name TEXT NOT NULL,
  canteen_name TEXT NOT NULL,
  food_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  servings_count INTEGER DEFAULT 10,
  price NUMERIC(10,2) DEFAULT 0,
  original_price NUMERIC(10,2),
  image_url TEXT NOT NULL,
  available_from TIMESTAMPTZ NOT NULL,
  collection_deadline TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'CLAIMED', 'COLLECTED', 'EXPIRED', 'CANCELLED')),
  claimed_by TEXT REFERENCES public.users(id),
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

-- 3. Claims table
CREATE TABLE IF NOT EXISTS public.claims (
  id TEXT PRIMARY KEY,
  food_post_id TEXT NOT NULL REFERENCES public.food_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id),
  user_name TEXT NOT NULL,
  user_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('CLAIMED', 'COLLECTED', 'CANCELLED')),
  claim_code TEXT NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ
);

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id),
  food_post_id TEXT REFERENCES public.food_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_food_posts_status ON public.food_posts(status);
CREATE INDEX IF NOT EXISTS idx_food_posts_college ON public.food_posts(college_name);
CREATE INDEX IF NOT EXISTS idx_claims_post ON public.claims(food_post_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON public.notifications(user_id);
