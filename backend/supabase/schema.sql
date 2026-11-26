-- ============================================================================
-- CineReward Supabase PostgreSQL Schema
-- Run this script once in your Supabase Dashboard -> SQL Editor -> New Query
-- Safe to re-run (idempotent)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text UNIQUE,
  email text UNIQUE,
  phone text UNIQUE,
  password text,
  google_id text,
  x_id text,
  supabase_uid text UNIQUE,
  profile_picture text,
  coins integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'movie_team')),
  booked_tickets jsonb NOT NULL DEFAULT '[]'::jsonb,
  reset_code_hash text,
  reset_code_expires timestamptz,
  reset_password_token text,
  reset_password_expires timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users (supabase_uid);

-- ----------------------------------------------------------------------------
-- 2. MOVIE TEAMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text,
  secret_key_hash text,
  secret_key_digest text UNIQUE,
  secret_key_hint text,
  secret_key text,
  assigned_movies jsonb NOT NULL DEFAULT '[]'::jsonb,
  movie_titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_by text,
  free_tickets_count integer NOT NULL DEFAULT 0,
  reset_code_hash text,
  reset_code_expires timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotent column upgrades for existing databases
ALTER TABLE public.movie_teams ADD COLUMN IF NOT EXISTS movie_titles jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.movie_teams ADD COLUMN IF NOT EXISTS assigned_by text;

CREATE INDEX IF NOT EXISTS idx_movie_teams_email ON public.movie_teams (lower(email));
CREATE INDEX IF NOT EXISTS idx_movie_teams_digest ON public.movie_teams (secret_key_digest);
CREATE INDEX IF NOT EXISTS idx_movie_teams_movies_gin ON public.movie_teams USING gin (assigned_movies);

-- ----------------------------------------------------------------------------
-- 3. CUSTOM / ADMIN MOVIES TABLE (Unified CineReward Template)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id text NOT NULL UNIQUE,
  title text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  overview text NOT NULL,
  media_type text NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv')),
  release_date text NOT NULL DEFAULT '',
  year text NOT NULL DEFAULT '',
  runtime integer NOT NULL DEFAULT 145,
  certification text NOT NULL DEFAULT 'UA 13+',
  director text NOT NULL DEFAULT 'Featured Director',
  language text NOT NULL DEFAULT 'English',
  original_language text NOT NULL DEFAULT 'en',
  genres jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality text NOT NULL DEFAULT 'IMAX 4K',
  country text NOT NULL DEFAULT 'IN',
  currency_code text NOT NULL DEFAULT 'INR',
  currency_symbol text NOT NULL DEFAULT '₹',
  total_budget numeric NOT NULL DEFAULT 0,
  total_collections numeric NOT NULL DEFAULT 0,
  poster_url text NOT NULL,
  backdrop_url text NOT NULL DEFAULT '',
  gallery_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  cast_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  trailer_url text NOT NULL DEFAULT '',
  trailer_key text NOT NULL DEFAULT '',
  ticket_pricing jsonb NOT NULL DEFAULT '{"classic":240,"grand":360,"majestic":540}'::jsonb,
  theatres jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_config jsonb NOT NULL DEFAULT '{"upi":true,"card":true,"wallets":true,"netBanking":true,"coinsRedeemable":true,"rewardCoinsPerSeat":25}'::jsonb,
  rating numeric NOT NULL DEFAULT 8.5,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movies_custom_id ON public.movies (custom_id);
CREATE INDEX IF NOT EXISTS idx_movies_published ON public.movies (is_published);

-- ----------------------------------------------------------------------------
-- 4. TICKETS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  movie_id text NOT NULL,
  movie_title text,
  theatre text NOT NULL,
  city text,
  language_format text,
  seat_number text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  showtime_end timestamptz,
  review_submitted boolean NOT NULL DEFAULT false,
  review_notification_sent boolean NOT NULL DEFAULT false,
  price numeric NOT NULL,
  snacks_total numeric NOT NULL DEFAULT 0,
  snacks_summary text NOT NULL DEFAULT '',
  convenience_fee numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Razorpay',
  razorpay_payment_id text,
  razorpay_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_movie_id ON public.tickets (movie_id);
CREATE INDEX IF NOT EXISTS idx_tickets_showtime_end ON public.tickets (showtime_end);

-- ----------------------------------------------------------------------------
-- 5. REVIEWS & DISCUSSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_name text,
  movie_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment text,
  ai_score numeric NOT NULL DEFAULT 0,
  ai_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text NOT NULL DEFAULT '',
  is_winner boolean NOT NULL DEFAULT false,
  is_verified_ticket boolean NOT NULL DEFAULT false,
  comment_type text NOT NULL DEFAULT 'review' CHECK (comment_type IN ('review', 'discussion')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON public.reviews (movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_comment_type ON public.reviews (comment_type);

-- ----------------------------------------------------------------------------
-- 6. PARTNER REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  event_type text NOT NULL,
  budget numeric NOT NULL,
  description text,
  event_date text,
  event_location text,
  location_url text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Contacted', 'Negotiating', 'Accepted', 'Rejected')),
  payment_code text UNIQUE,
  payment_amount numeric,
  payment_status text NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid')),
  paid_at timestamptz,
  razorpay_payment_id text,
  admin_message text,
  reject_reason text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_requests_user_id ON public.partner_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_payment_code ON public.partner_requests (payment_code);

-- ----------------------------------------------------------------------------
-- AUTO-UPDATE `updated_at` TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['users', 'movie_teams', 'movies', 'tickets', 'reviews', 'partner_requests'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Backend connects with SUPABASE_SERVICE_ROLE_KEY which bypasses RLS safely.
-- Enabling RLS ensures public anon keys cannot directly query backend tables.
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

