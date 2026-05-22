/*
  # Songa Schema - Safe idempotent setup
  Creates all tables and policies only if they don't already exist.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('driver', 'passenger')),
  full_name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('10_seater', '14_seater')),
  route_from text NOT NULL,
  route_to text NOT NULL,
  price_per_seat integer NOT NULL,
  photos text[] DEFAULT '{}',
  is_live boolean DEFAULT false,
  departure_time timestamptz,
  total_rides integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_number integer NOT NULL,
  amount_paid integer NOT NULL,
  mpesa_number text NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, seat_number)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, passenger_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Add vehicle detail columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'registration_number') THEN
    ALTER TABLE vehicles ADD COLUMN registration_number text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'sacco') THEN
    ALTER TABLE vehicles ADD COLUMN sacco text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'expires_at') THEN
    ALTER TABLE vehicles ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Auto-expiry trigger
CREATE OR REPLACE FUNCTION set_vehicle_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.departure_time + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_vehicle_expiry ON vehicles;
CREATE TRIGGER trigger_set_vehicle_expiry
  BEFORE INSERT OR UPDATE OF departure_time ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_expiry();

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

-- Profiles policies (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view all profiles') THEN
    CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Vehicles policies (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Anyone can view live vehicles') THEN
    CREATE POLICY "Anyone can view live vehicles" ON vehicles FOR SELECT TO authenticated USING (is_live = true OR driver_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Drivers can insert their own vehicles') THEN
    CREATE POLICY "Drivers can insert their own vehicles" ON vehicles FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Drivers can update their own vehicles') THEN
    CREATE POLICY "Drivers can update their own vehicles" ON vehicles FOR UPDATE TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Drivers can delete their own vehicles') THEN
    CREATE POLICY "Drivers can delete their own vehicles" ON vehicles FOR DELETE TO authenticated USING (driver_id = auth.uid());
  END IF;
END $$;

-- Bookings policies (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can view their own bookings') THEN
    CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT TO authenticated USING (passenger_id = auth.uid() OR vehicle_id IN (SELECT id FROM vehicles WHERE driver_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Passengers can create bookings') THEN
    CREATE POLICY "Passengers can create bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (passenger_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can update their own bookings') THEN
    CREATE POLICY "Users can update their own bookings" ON bookings FOR UPDATE TO authenticated USING (passenger_id = auth.uid()) WITH CHECK (passenger_id = auth.uid());
  END IF;
END $$;

-- Reviews policies (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Anyone can view reviews') THEN
    CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Passengers can create reviews') THEN
    CREATE POLICY "Passengers can create reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (passenger_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Passengers can update their own reviews') THEN
    CREATE POLICY "Passengers can update their own reviews" ON reviews FOR UPDATE TO authenticated USING (passenger_id = auth.uid()) WITH CHECK (passenger_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Passengers can delete their own reviews') THEN
    CREATE POLICY "Passengers can delete their own reviews" ON reviews FOR DELETE TO authenticated USING (passenger_id = auth.uid());
  END IF;
END $$;

-- Public (anon) read policies (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Public can view live vehicles') THEN
    CREATE POLICY "Public can view live vehicles" ON vehicles FOR SELECT TO anon USING (is_live = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public can view profiles') THEN
    CREATE POLICY "Public can view profiles" ON profiles FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Public can view reviews') THEN
    CREATE POLICY "Public can view reviews" ON reviews FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Public can view booked seats') THEN
    CREATE POLICY "Public can view booked seats" ON bookings FOR SELECT TO anon USING (payment_status = 'completed');
  END IF;
END $$;
