DO $remo_board$
BEGIN
  CREATE TABLE IF NOT EXISTS public.remo_posts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
    category text NOT NULL CHECK (category IN ('notice','news','project')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
  );
  CREATE INDEX IF NOT EXISTS remo_posts_public_idx ON public.remo_posts(id DESC) WHERE archived_at IS NULL;
  CREATE TABLE IF NOT EXISTS public.remo_admin_sessions (
    token_hash text PRIMARY KEY,
    password_version text NOT NULL,
    expires_at timestamptz NOT NULL
  );
  CREATE TABLE IF NOT EXISTS public.remo_login_limits (
    key text PRIMARY KEY,
    bucket bigint NOT NULL,
    attempts integer NOT NULL
  );
END;
$remo_board$;
