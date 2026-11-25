CREATE TABLE garden_admins (
  id TEXT PRIMARY KEY,
  garden_code TEXT NOT NULL REFERENCES gardens(code) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL
);

INSERT INTO garden_admins (id, garden_code, secret_hash)
SELECT members.id, gardens.code, members.secret_hash
FROM gardens JOIN members ON members.id = gardens.owner_id;

-- Remove the placeholder profile created by the old administrator setup.
DELETE FROM members
WHERE id IN (SELECT id FROM garden_admins)
  AND nickname = '花园主人' AND completed = 0 AND growth = 0 AND planted = 0;

-- Retain any real progress as a regular profile, with a separate member link.
UPDATE members SET secret_hash = lower(hex(randomblob(32)))
WHERE id IN (SELECT id FROM garden_admins);

ALTER TABLE gardens DROP COLUMN owner_id;
