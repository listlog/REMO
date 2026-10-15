-- Run once on REMO's existing Neon database before enabling registrations.
-- One atomic statement, suitable for the Neon SQL editor.
DO $migration$
BEGIN
  CREATE TABLE IF NOT EXISTS public.remo_reservations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL UNIQUE CHECK (length(email) BETWEEN 3 AND 254 AND email=lower(email)),
    cancel_token_hash text NOT NULL UNIQUE CHECK (cancel_token_hash ~ '^[a-f0-9]{64}$'),
    consent_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
  );
  CREATE INDEX IF NOT EXISTS remo_reservations_expiry ON public.remo_reservations (expires_at);
  CREATE TABLE IF NOT EXISTS public.remo_reservation_limits (
    key text PRIMARY KEY,
    bucket bigint NOT NULL,
    attempts integer NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END;
$migration$;
