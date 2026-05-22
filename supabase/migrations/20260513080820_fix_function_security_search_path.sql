/*
  # Fix Function Security Issues

  ## Issues Resolved

  1. Mutable search_path on all three public functions
     - `sync_profile_email`, `set_vehicle_expiry`, `expire_old_vehicles`
     - Fix: add `SET search_path = ''` to each, and use fully-qualified table names

  2. `sync_profile_email` exposed as SECURITY DEFINER to anon + authenticated roles
     - Fix: switch to SECURITY INVOKER (it only runs as a trigger under auth context)
     - Fix: revoke EXECUTE from public/anon/authenticated roles (trigger-only function)

  ## Notes
  - All three functions are recreated with identical logic, just hardened
  - `sync_profile_email` is a trigger function; it never needs to be called via RPC
*/

-- ─── 1. sync_profile_email ────────────────────────────────────────────────────
-- Switch to SECURITY INVOKER and lock down search_path.
-- Revoke RPC access from all roles — it is only invoked by its trigger.

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM authenticated;

-- ─── 2. set_vehicle_expiry ────────────────────────────────────────────────────
-- Add immutable search_path. Logic unchanged.

CREATE OR REPLACE FUNCTION public.set_vehicle_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.expires_at := NEW.departure_time + INTERVAL '24 hours';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_vehicle_expiry() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_vehicle_expiry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_vehicle_expiry() FROM authenticated;

-- ─── 3. expire_old_vehicles ───────────────────────────────────────────────────
-- Add immutable search_path. Logic unchanged.

CREATE OR REPLACE FUNCTION public.expire_old_vehicles()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.vehicles
  SET is_live = false
  WHERE is_live = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.expire_old_vehicles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_old_vehicles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_old_vehicles() FROM authenticated;
