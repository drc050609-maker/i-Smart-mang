-- Campus location for staff accounts (Brooklyn and Staten Island).

CREATE TYPE staff_location AS ENUM ('brooklyn', 'staten_island');

ALTER TABLE staff_accounts
  ADD COLUMN location staff_location NOT NULL DEFAULT 'brooklyn';

CREATE INDEX staff_accounts_location_idx ON staff_accounts (location);

COMMENT ON COLUMN staff_accounts.location IS 'Campus for manager accounts. Admins default to Brooklyn but can manage all locations.';
