/*
  # Add central/preferred location to vehicles

  ## Summary
  Drivers can now specify a preferred staging/central location where their vehicle is parked
  and available for pickup. This is a free-text field with an optional geocoded lat/lng pair
  so the passenger map can show it.

  ## Changes
  - `vehicles` table: add `central_location` (text), `central_lat` (float8), `central_lng` (float8)

  ## Notes
  - All new columns are nullable — existing vehicles are unaffected.
  - No RLS changes needed; follows existing vehicle policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'central_location'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN central_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'central_lat'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN central_lat float8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'central_lng'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN central_lng float8;
  END IF;
END $$;
