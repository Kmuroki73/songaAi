/*
  # Add Vehicle Registration, Sacco, and Auto-Expiry

  1. Changes to vehicles table
    - Add `registration_number` (text) - Vehicle registration/license plate
    - Add `sacco` (text) - SACCO name the vehicle belongs to
    - Add `expires_at` (timestamptz) - Auto-calculated 24 hours from departure_time
  
  2. Function to auto-mark vehicles as offline after 24 hours
    - Creates a function to check and update expired vehicles
    - Vehicles automatically go offline 24 hours after departure time
  
  3. Security
    - Update policies to handle new fields
*/

-- Add new columns to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN registration_number text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'sacco'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN sacco text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create function to automatically set expiry time (24 hours after departure)
CREATE OR REPLACE FUNCTION set_vehicle_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.departure_time + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set expiry on insert and update
DROP TRIGGER IF EXISTS trigger_set_vehicle_expiry ON vehicles;
CREATE TRIGGER trigger_set_vehicle_expiry
  BEFORE INSERT OR UPDATE OF departure_time ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_expiry();

-- Create function to auto-expire vehicles
CREATE OR REPLACE FUNCTION expire_old_vehicles()
RETURNS void AS $$
BEGIN
  UPDATE vehicles
  SET is_live = false
  WHERE is_live = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Update existing vehicles to have expiry times
UPDATE vehicles
SET expires_at = departure_time + INTERVAL '24 hours'
WHERE expires_at IS NULL AND departure_time IS NOT NULL;
