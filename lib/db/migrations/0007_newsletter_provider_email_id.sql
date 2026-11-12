ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider_email_id text;

CREATE INDEX IF NOT EXISTS email_events_provider_email_id_idx
  ON email_events(provider_email_id);