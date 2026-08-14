-- Create a function to get user cubes (owned + participated) bypassing RLS
CREATE OR REPLACE FUNCTION get_user_cubes()
RETURNS SETOF cubes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM cubes c
  WHERE c.owner_id = auth.uid()
  UNION
  SELECT c.*
  FROM cubes c
  INNER JOIN cube_participants cp ON cp.cube_id = c.id
  WHERE cp.user_id = auth.uid()
  AND cp.status = 'accepted';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_cubes() TO authenticated;