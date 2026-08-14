-- Add pending_invitations table for email-based invitations
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cube_id UUID REFERENCES cubes(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cube_id, email)
);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_invitations_cube_id ON pending_invitations(cube_id);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(email);

-- RLS Policies
CREATE POLICY "Owners can view pending invitations" ON pending_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = pending_invitations.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create pending invitations" ON pending_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = pending_invitations.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view invitations sent to them" ON pending_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can delete pending invitations" ON pending_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cubes 
      WHERE cubes.id = pending_invitations.cube_id 
      AND cubes.owner_id = auth.uid()
    )
  );

-- For testing: Add a policy to allow anon key to view invitations (REMOVE IN PRODUCTION)
CREATE POLICY "Allow anon to view pending invitations for testing" ON pending_invitations
  FOR SELECT USING (true);