ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all_subscribers';

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_audience_check;

ALTER TABLE messages
  ADD CONSTRAINT messages_audience_check
  CHECK (audience IN ('all_subscribers', 'verified_purchasers', 'new_subscribers'));