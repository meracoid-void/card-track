-- Create a function to get a single cube by ID (owned or participated) bypassing RLS
CREATE OR REPLACE FUNCTION get_cube_by_id(cube_id_param UUID)
RETURNS SETOF cubes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM cubes c
  WHERE c.id = cube_id_param
  AND (
    c.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cube_participants cp
      WHERE cp.cube_id = c.id
      AND cp.user_id = auth.uid()
      AND cp.status = 'accepted'
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_cube_by_id(UUID) TO authenticated;