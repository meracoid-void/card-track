-- Migration to allow multiple copies of the same card in a cube
-- This removes the unique constraint on (cube_id, card_id)

-- Drop the unique constraint
ALTER TABLE cube_cards DROP CONSTRAINT IF EXISTS cube_cards_cube_id_card_id_key;