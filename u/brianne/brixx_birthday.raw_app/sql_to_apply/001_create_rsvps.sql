-- One row per RSVP submission. A guest who submits again with the same name
-- adds a new row; totals use each name's most recent answer.
CREATE TABLE IF NOT EXISTS brixx_birthday.rsvps (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name        TEXT        NOT NULL,
    attending   BOOLEAN     NOT NULL,
    adults      INTEGER     NOT NULL DEFAULT 0 CHECK (adults BETWEEN 0 AND 20),
    kids        INTEGER     NOT NULL DEFAULT 0 CHECK (kids BETWEEN 0 AND 20),
    dietary     TEXT,
    note        TEXT
);
