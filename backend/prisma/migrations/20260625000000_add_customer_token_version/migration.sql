-- D38: add token_version to Customer so JWTs can be immediately revoked on
-- password reset or account deactivation. CustomerJwtStrategy.validate()
-- reloads this value on every authenticated request and rejects tokens whose
-- embedded tokenVersion no longer matches.
ALTER TABLE "Customer" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
