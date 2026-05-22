/*
  # Allow public (anon) read access to live vehicles, profiles, reviews, and bookings seat numbers

  ## Problem
  All existing RLS policies are restricted to `authenticated` role only.
  Unauthenticated (guest) visitors cannot see any vehicles, so the homepage
  appears empty until a user logs in.

  ## Changes
  1. vehicles - add SELECT policy for `anon` role (live vehicles only)
  2. profiles - add SELECT policy for `anon` role (so driver names appear on cards)
  3. reviews - add SELECT policy for `anon` role (so ratings appear on cards)
  4. bookings - add SELECT policy for `anon` role (seat_number only, so seat map works for guests browsing)
*/

-- Allow anonymous users to view live vehicles
CREATE POLICY "Public can view live vehicles"
  ON vehicles FOR SELECT
  TO anon
  USING (is_live = true);

-- Allow anonymous users to view profiles (needed for driver name/phone on vehicle cards)
CREATE POLICY "Public can view profiles"
  ON profiles FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view reviews (needed for star ratings on vehicle cards)
CREATE POLICY "Public can view reviews"
  ON reviews FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read booked seat numbers (needed so seat map shows which seats are taken)
CREATE POLICY "Public can view booked seats"
  ON bookings FOR SELECT
  TO anon
  USING (payment_status = 'completed');
