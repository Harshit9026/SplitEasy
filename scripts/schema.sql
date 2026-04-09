-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create splits table
CREATE TABLE IF NOT EXISTS splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create split_members table
CREATE TABLE IF NOT EXISTS split_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  split_id UUID NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS splits_created_by_idx ON splits(created_by);
CREATE INDEX IF NOT EXISTS split_members_split_id_idx ON split_members(split_id);
CREATE INDEX IF NOT EXISTS split_members_user_id_idx ON split_members(user_id);

-- Enable RLS
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own splits" ON splits;
DROP POLICY IF EXISTS "Users can create splits" ON splits;
DROP POLICY IF EXISTS "Users can update their own splits" ON splits;
DROP POLICY IF EXISTS "Users can delete their own splits" ON splits;
DROP POLICY IF EXISTS "Anyone can view split members" ON split_members;
DROP POLICY IF EXISTS "Anyone can create split members" ON split_members;
DROP POLICY IF EXISTS "Users can update their split member status" ON split_members;

-- RLS Policies for splits table
CREATE POLICY "Users can view their own splits" ON splits
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM split_members
      WHERE split_members.split_id = splits.id
      AND (split_members.user_id = auth.uid() OR split_members.phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Users can create splits" ON splits
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own splits" ON splits
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own splits" ON splits
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for split_members table
CREATE POLICY "Anyone can view split members" ON split_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM splits
      WHERE splits.id = split_members.split_id
      AND (
        splits.created_by = auth.uid() OR
        split_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can create split members" ON split_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM splits
      WHERE splits.id = split_members.split_id
      AND splits.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their split member status" ON split_members
  FOR UPDATE USING (
    split_members.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM splits
      WHERE splits.id = split_members.split_id
      AND splits.created_by = auth.uid()
    )
  );
