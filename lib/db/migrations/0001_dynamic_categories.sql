CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  featured boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS book_categories (
  book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (book_id, category_id)
);

ALTER TABLE books ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;

INSERT INTO categories (id, name)
SELECT lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g')), name
FROM (VALUES
  ('Dark romance'), ('Light romance / fluffy romance'), ('MM romance (BL)'), ('FF romance (GL)'),
  ('Mafia romance'), ('Billionaire romance'), ('Werewolf/Lycan romance'), ('Vampire romance'),
  ('Omegaverse'), ('Fated mates'), ('Enemies to lovers'), ('Second chance romance'), ('Rejected mate/Luna'),
  ('Revenge romance'), ('Rebirth/reincarnation romance'), ('Fantasy romance (romantasy)'), ('High fantasy'),
  ('Urban fantasy'), ('Dragon fantasy'), ('System/progression fantasy (LitRPG)'), ('Cultivation fantasy (xianxia/wuxia style)'),
  ('Isekai'), ('Reverse harem'), ('Harem'), ('Royal romance/king and queen'), ('CEO romance'), ('Secret baby romance'),
  ('Marriage of convenience'), ('Historical romance'), ('Regency romance'), ('Paranormal romance'), ('Demon/angel romance'),
  ('Witch/warlock romance'), ('Time travel romance'), ('Sports romance'), ('College/campus romance'), ('Age gap romance'),
  ('Forbidden romance'), ('Stepbrother/taboo romance'), ('Bad boy romance'), ('Single dad romance'), ('Fake relationship romance'),
  ('Contract marriage'), ('Possessive/obsessive love (yandere)'), ('Alien romance'), ('Sci-fi romance'), ('Dystopian romance'),
  ('Action/thriller romance'), ('Psychological thriller'), ('Crime thriller'), ('Ghost/horror romance'), ('Slow burn romance')
) AS seed(name)
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (id, name) VALUES
  ('romance', 'Dark romance'), ('werewolf-lycan-romance', 'Werewolf/Lycan romance'),
  ('paranormal-romance', 'Paranormal romance'), ('billionaire-romance', 'Billionaire romance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO book_categories (book_id, category_id)
SELECT b.id, c.id
FROM books b
JOIN LATERAL unnest(b.categories) old_name ON true
JOIN categories c ON c.name = CASE old_name
  WHEN 'Romance' THEN 'Dark romance'
  WHEN 'Werewolf' THEN 'Werewolf/Lycan romance'
  WHEN 'Paranormal' THEN 'Paranormal romance'
  WHEN 'Dark Romance' THEN 'Dark romance'
  WHEN 'Billionaire Romance' THEN 'Billionaire romance'
  ELSE old_name
END
ON CONFLICT DO NOTHING;

UPDATE books SET is_completed = true WHERE 'Completed Series' = ANY(categories);
ALTER TABLE books DROP COLUMN IF EXISTS categories;