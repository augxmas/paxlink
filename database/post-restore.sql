-- Run only against the newly restored database, before starting the app.
START TRANSACTION;
UPDATE login_sessions SET expires_at = LEAST(expires_at, NOW()),
  logged_out_at = COALESCE(logged_out_at, NOW()), logout_reason = 'timeout'
  WHERE logged_out_at IS NULL;
UPDATE supervisor_login_codes SET expires_at = LEAST(expires_at, NOW());
UPDATE parish_login_codes SET expires_at = LEAST(expires_at, NOW());
UPDATE parish_registration_codes SET expires_at = LEAST(expires_at, NOW());
UPDATE parishioner_registration_codes SET expires_at = LEAST(expires_at, NOW());
UPDATE parishioner_login_codes SET expires_at = LEAST(expires_at, NOW());
COMMIT;
