/*
  # Songa Ride-Sharing Platform Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `role` (text: 'driver' or 'passenger')
      - `full_name` (text)
      - `phone` (text)
      - `created_at` (timestamptz)
    
    - `vehicles`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references profiles)
      - `vehicle_type` (text: '10_seater' or '14_seater')
      - `route_from` (text)
      - `route_to` (text)
      - `price_per_seat` (integer)
      - `photos` (text array)
      - `is_live` (boolean)
      - `departure_time` (timestamptz)
      - `total_rides` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `passenger_id` (uuid, references profiles)
      - `seat_number` (integer)
      - `amount_paid` (integer)
      - `mpesa_number` (text)
      - `payment_status` (text: 'pending', 'completed', 'failed')
      - `created_at` (timestamptz)
    
    - `reviews`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `passenger_id` (uuid, references profiles)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Allow passengers to view live vehicles
    - Allow drivers to manage their vehicles
    - Allow passengers to create bookings and reviews
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('driver', 'passenger')),
  full_name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create vehicles table
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

-- Create bookings table
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

-- Create reviews table
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

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Vehicles policies
CREATE POLICY "Anyone can view live vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (is_live = true OR driver_id = auth.uid());

CREATE POLICY "Drivers can insert their own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can delete their own vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (driver_id = auth.uid());

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid() OR vehicle_id IN (
    SELECT id FROM vehicles WHERE driver_id = auth.uid()
  ));

CREATE POLICY "Passengers can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Passengers can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Passengers can update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Passengers can delete their own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid());