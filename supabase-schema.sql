-- Run this in your Supabase SQL Editor to set up the pipeline schema.

-- Users are managed by Supabase Auth (auth.users table).
-- This extensions table links auth users to profiles.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Agent modules configuration synced across repos
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  system_instruction TEXT,
  temperature FLOAT DEFAULT 0.7,
  top_p FLOAT DEFAULT 0.9,
  top_k INT DEFAULT 40,
  show_robot BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own agents"
  ON public.agents FOR ALL USING (auth.uid() = user_id);

-- Usage logs for real-time analytics
CREATE TABLE public.usage_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  cost NUMERIC(10,8) DEFAULT 0,
  duration_ms INT,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage"
  ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);

-- Stripe subscription info
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Realtime: enable broadcast for live usage dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_logs;

-- ── Memories (shared between outer and inner apps) ──────────────────
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own memories"
  ON public.memories FOR ALL USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;

-- ── Workflows (AI Wonder Canvas state, synced across apps) ──────────
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  nodes JSONB NOT NULL DEFAULT '[]',
  connections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own workflows"
  ON public.workflows FOR ALL USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;

-- ── Agents: enable realtime for cross-app sync ──────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
