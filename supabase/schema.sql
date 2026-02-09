-- ==============================================================================
-- TradeNote Database Schema
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. trades table (Trade History)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid(), -- Default to current user
    symbol_code TEXT NOT NULL,
    symbol_name TEXT NOT NULL,
    market TEXT, -- e.g. 'TSE', 'NYSE'
    trade_type TEXT NOT NULL,
    term_type TEXT, -- 'CASH', 'CREDIT', 'DAY'
    custody_type TEXT, -- 'SPECIFIC', 'GENERAL', 'NISA'
    execution_date DATE NOT NULL,
    settlement_date DATE,
    quantity INTEGER NOT NULL,
    average_price NUMERIC(12,4) NOT NULL,
    fee NUMERIC(12,4) DEFAULT 0,
    tax NUMERIC(12,4) DEFAULT 0,
    settlement_amount NUMERIC(12,4) NOT NULL,
    intraday_amount NUMERIC(12,4),
    source TEXT NOT NULL DEFAULT 'manual', -- 'csv', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. trade_comments table (Daily Reflections)
CREATE TABLE IF NOT EXISTS public.trade_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    execution_date DATE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, execution_date) -- One comment per user per day
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

-- Policies for trades
CREATE POLICY "Users can view their own trades" 
    ON public.trades FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" 
    ON public.trades FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
    ON public.trades FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" 
    ON public.trades FOR DELETE 
    USING (auth.uid() = user_id);

-- Policies for trade_comments
CREATE POLICY "Users can view their own comments" 
    ON public.trade_comments FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comments" 
    ON public.trade_comments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
    ON public.trade_comments FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
    ON public.trade_comments FOR DELETE 
    USING (auth.uid() = user_id);

-- ==============================================================================
-- Trigger for automatic updated_at (Optional but recommended)
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trade_comments_updated_at BEFORE UPDATE ON public.trade_comments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
