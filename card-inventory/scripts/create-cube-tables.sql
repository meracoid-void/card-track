-- Cube Feature Database Migration
-- This script creates the tables and RLS policies for the cube drafting feature

-- Create cubes table
CREATE TABLE IF NOT EXISTS cubes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cube_cards table
CREATE TABLE IF NOT EXISTS cube_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cube_id UUID REFERENCES cubes(id) ON DELETE CASCADE NOT NULL,
  card_id VARCHAR(255) NOT NULL,
  card_name VARCHAR(255) NOT NULL,
  image_url TEXT,
  set_name VARCHAR(255),
  card_number VARCHAR(50),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cube_id, card_id)
);

-- Create cube_participants table
CREATE TABLE IF NOT EXISTS cube_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cube_id UUID REFERENCES cubes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cube_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE cubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cube_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cube_participants ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cubes_owner_id ON cubes(owner_id);
CREATE INDEX IF NOT EXISTS idx_cube_cards_cube_id ON cube_cards(cube_id);
CREATE INDEX IF NOT EXISTS idx_cube_participants_cube_id ON cube_participants(cube_id);
CREATE INDEX IF NOT EXISTS idx_cube_participants_user_id ON cube_participants(user_id);

-- RLS Policies for cubes table
CREATE POLICY "Users can view their own cubes" ON cubes
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view cubes they participate in" ON cubes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cube_participants 
      WHERE cube_participants.cube_id = cubes.id 
      AND cube_participants.user_id = auth.uid() 
      AND cube_participants.status = 'accepted'
    )
  );

CREATE POLICY "Users can create cubes" ON cubes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their cubes" ON cubes
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their cubes" ON cubes
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for cube_cards table
CREATE POLICY "Users can view cards in cubes they own" ON cube_cards
  FOR SELECT USING (
    cube_id IN (SELECT id FROM cubes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view cards in cubes they participate in" ON cube_cards
  FOR SELECT USING (
    cube_id IN (
      SELECT cube_id FROM cube_participants 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Owners can add cards to their cubes" ON cube_cards
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT owner_id FROM cubes WHERE id = cube_id)
  );

CREATE POLICY "Owners can remove cards from their cubes" ON cube_cards
  FOR DELETE USING (
    auth.uid() = (SELECT owner_id FROM cubes WHERE id = cube_id)
  );

-- RLS Policies for cube_participants table
CREATE POLICY "Users can view participants in cubes they own" ON cube_participants
  FOR SELECT USING (
    cube_id IN (SELECT id FROM cubes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view participants in cubes they participate in" ON cube_participants
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Owners can invite participants" ON cube_participants
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT owner_id FROM cubes WHERE id = cube_id)
  );

CREATE POLICY "Users can accept/decline their own invites" ON cube_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove participants" ON cube_participants
  FOR DELETE USING (
    auth.uid() = (SELECT owner_id FROM cubes WHERE id = cube_id)
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for cubes table
CREATE TRIGGER update_cubes_updated_at
  BEFORE UPDATE ON cubes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();