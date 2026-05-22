/*
  # Fix signup: auto-create profile via trigger

  ## Problem
  When a user signs up via supabase.auth.signUp(), the client immediately tries to
  INSERT into profiles. However, the session is not yet active at that point, so
  auth.uid() returns NULL and the RLS INSERT policy blocks the insert, causing
  "Database error saving new user".

  ## Solution
  Add a trigger on auth.users that automatically creates a profile row after a new
  user is inserted. The trigger reads full_name, phone, and role from the user's
  raw_user_meta_data (passed via signUp options.data).

  ## Changes
  - New function: handle_new_user() — creates a profiles row from auth metadata
  - New trigger: on_auth_user_created — fires AFTER INSERT on auth.users
  - The client-side profile insert in AuthContext will be removed (handled here)

  ## Security
  - Function runs with SECURITY DEFINER so it bypasses RLS for the insert
  - Only fires on new user creation
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
