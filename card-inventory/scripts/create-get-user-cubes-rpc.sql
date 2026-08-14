-- Create a function to get user cubes (owned + participated) bypassing RLS
CREATE OR REPLACE FUNCTION get_user_cubes()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.owner_id,
    c.name,
    c.description,
    c.created_at,
    c.updated_at
  FROM cubes c
  WHERE c.owner_id = auth.uid()
  UNION
  SELECT 
    c.id,
    c.owner_id,
    c.name,
    c.description,
    c.created_at,
    c.updated_at
  FROM cubes c
  INNER JOIN cube_participants cp ON cp.cube_id = c.id
  WHERE cp.user_id = auth.uid()
  AND cp.status = 'accepted';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_cubes() TO authenticated;