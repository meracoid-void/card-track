-- Drop all existing policies to fix infinite recursion
DROP POLICY IF EXISTS "Users can view participants in their cubes" ON cube_participants;
DROP POLICY IF EXISTS "Users can view cards in their cubes" ON cube_cards;
DROP POLICY IF EXISTS "Users can view cubes they participate in" ON cubes;
DROP POLICY IF EXISTS "Users can view cards in cubes they own" ON cube_cards;
DROP POLICY IF EXISTS "Users can view cards in cubes they participate in" ON cube_cards;
DROP POLICY IF EXISTS "Users can view participants in cubes they own" ON cube_participants;
DROP POLICY IF EXISTS "Users can view participants in cubes they participate in" ON cube_participants;
DROP POLICY IF EXISTS "Users can view their own cubes" ON cubes;
DROP POLICY IF EXISTS "Users can create cubes" ON cubes;
DROP POLICY IF EXISTS "Owners can update their cubes" ON cubes;
DROP POLICY IF EXISTS "Owners can delete their cubes" ON cubes;
DROP POLICY IF EXISTS "Owners can add cards to their cubes" ON cube_cards;
DROP POLICY IF EXISTS "Owners can remove cards from their cubes" ON cube_cards;
DROP POLICY IF EXISTS "Owners can invite participants" ON cube_participants;
DROP POLICY IF EXISTS "Users can accept/decline their own invites" ON cube_participants;
DROP POLICY IF EXISTS "Owners can remove participants" ON cube_participants;

-- Simplified RLS Policies for cubes table (no cross-table references)
CREATE POLICY "Users can view their own cubes" ON cubes
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create cubes" ON cubes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their cubes" ON cubes
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their cubes" ON cubes
  FOR DELETE USING (auth.uid() = owner_id);

-- Simplified RLS Policies for cube_cards table
CREATE POLICY "Users can view cards in cubes they own" ON cube_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = cube_cards.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view cards in cubes they participate in" ON cube_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cube_participants 
      WHERE cube_participants.cube_id = cube_cards.cube_id 
      AND cube_participants.user_id = auth.uid() 
      AND cube_participants.status = 'accepted'
    )
  );

CREATE POLICY "Owners can add cards to their cubes" ON cube_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = cube_cards.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can remove cards from their cubes" ON cube_cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = cube_cards.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

-- Simplified RLS Policies for cube_participants table
CREATE POLICY "Users can view participants in cubes they own" ON cube_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = cube_participants.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view participants in cubes they participate in" ON cube_participants
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Owners can invite participants" ON cube_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = cube_participants.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can accept/decline their own invites" ON cube_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove participants" ON cube_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = cube_participants.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );