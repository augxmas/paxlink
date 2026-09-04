-- Reset parishioner accounts and transient authentication data for Hopyeongdong parish.
-- This migration is intentionally repeatable.
START TRANSACTION;

SET @hopyeongdong_parish_id := (
  SELECT id
    FROM parishes
   WHERE parish_code = 'hopyeongdong'
   LIMIT 1
);

DELETE FROM login_sessions
 WHERE user_type = 'parishioner'
   AND parish_id = @hopyeongdong_parish_id;

DELETE FROM parishioner_login_codes
 WHERE parish_id = @hopyeongdong_parish_id;

DELETE FROM parishioner_registration_codes
 WHERE parish_id = @hopyeongdong_parish_id;

DELETE FROM parishioners
 WHERE parish_id = @hopyeongdong_parish_id;

COMMIT;
