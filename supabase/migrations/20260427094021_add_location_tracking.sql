/*
  # Add Location Tracking

  1. Changes to `bookings`
    - `pickup_location` (text) — human-readable address the passenger enters
    - `pickup_lat` (float8) — latitude of pickup point
    - `pickup_lng` (float8) — longitude of pickup point

  2. Changes to `vehicles`
    - `driver_lat` (float8) — live latitude of the driver's current position
    - `driver_lng` (float8) — live longitude of the driver's current position
    - `driver_location_updated_at` (timestamptz) — when driver position was last broadcast

  3. Security
    - No new tables; existing RLS policies cover column-level access
    - Drivers can update their own vehicle's location columns
    - Passengers can update their own booking's pickup columns
*/

-- Booking pickup location columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pickup_location'
  ) THEN
    ALTER TABLE bookings ADD COLUMN pickup_location text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pickup_lat'
  ) THEN
    ALTER TABLE bookings ADD COLUMN pickup_lat float8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pickup_lng'
  ) THEN
    ALTER TABLE bookings ADD COLUMN pickup_lng float8;
  END IF;
END $$;

-- Vehicle live driver location columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'driver_lat'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN driver_lat float8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'driver_lng'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN driver_lng float8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'driver_location_updated_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN driver_location_updated_at timestamptz;
  END IF;
END $$;
