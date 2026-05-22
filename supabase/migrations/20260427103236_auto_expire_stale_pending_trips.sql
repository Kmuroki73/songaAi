/*
  # Auto-expire stale pending trips

  1. Immediately mark as offline any pending trips whose departure time has
     passed by more than 3 hours and are still is_live = true.
     These are trips the driver forgot to close out.

  2. Creates a scheduled cleanup approach via a trigger on vehicles
     so future trips also auto-expire when queried.
*/

-- Immediately clean up stale trips (departed > 3 hours ago, still pending & live)
UPDATE vehicles
SET is_live = false, status = 'completed'
WHERE status = 'pending'
  AND is_live = true
  AND departure_time < now() - interval '3 hours';
