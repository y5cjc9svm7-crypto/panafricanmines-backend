-- Referral programme.
-- A "referrer" is a person who opted in and received a unique code. When an asset
-- is listed with that code and later sells, the referrer earns 20% of the gross
-- commission StraMin receives (paid manually after the money clears).

CREATE TABLE IF NOT EXISTS referrers (
  id             uuid PRIMARY KEY,
  code           text UNIQUE NOT NULL,
  full_name      text NOT NULL,
  email          text NOT NULL,
  country        text,
  age_confirmed  boolean NOT NULL DEFAULT false,
  terms_version  text,
  accepted_at    timestamptz,
  reg_ip         text,
  reg_user_agent text,
  status         text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrers_email_idx ON referrers (lower(email));

-- Link from a listing to the referrer whose code was used (captured once, at
-- submission). referral_code is denormalised for easy display in the operator
-- view; referral_flag holds a short, non-blocking review reason (e.g. 'same-ip').
ALTER TABLE listings ADD COLUMN IF NOT EXISTS referrer_id   uuid REFERENCES referrers(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS referral_flag text;
