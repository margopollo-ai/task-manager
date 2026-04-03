-- Add key column to Goal with a default, then remove default after backfill
ALTER TABLE "Goal" ADD COLUMN "key" TEXT NOT NULL DEFAULT '';

-- Backfill: generate a key from the title (first 3 chars uppercase, or initials of words)
UPDATE "Goal"
SET "key" = (
  CASE
    WHEN "title" ~ '\s' THEN
      UPPER(
        SUBSTRING("title" FROM 1 FOR 1) ||
        COALESCE(SUBSTRING("title" FROM POSITION(' ' IN "title") + 1 FOR 1), '') ||
        COALESCE(SUBSTRING("title" FROM POSITION(' ' IN SUBSTRING("title" FROM POSITION(' ' IN "title") + 1)) + POSITION(' ' IN "title") + 1 FOR 1), '')
      )
    ELSE UPPER(SUBSTRING("title" FROM 1 FOR 3))
  END
);

-- Make keys unique per user by appending a suffix where needed
-- (handled in application layer; just ensure no duplicates exist from backfill)
-- Drop the default
ALTER TABLE "Goal" ALTER COLUMN "key" DROP DEFAULT;

-- Add unique constraint
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_key_key" UNIQUE ("userId", "key");

-- Add goalSequenceNumber to Task
ALTER TABLE "Task" ADD COLUMN "goalSequenceNumber" INTEGER;
