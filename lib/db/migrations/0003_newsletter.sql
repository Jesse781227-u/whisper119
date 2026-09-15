CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  source text NOT NULL CHECK (source IN ('signup_form', 'purchase', 'both')),
  subscribed boolean NOT NULL DEFAULT true,
  consented_at timestamptz NOT NULL DEFAULT now(),
  unsubscribe_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id),
  subscriber_id uuid NOT NULL REFERENCES subscribers(id),
  event_type text NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  raw_payload jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_message_id_idx ON email_events(message_id);
CREATE INDEX IF NOT EXISTS email_events_subscriber_id_idx ON email_events(subscriber_id);