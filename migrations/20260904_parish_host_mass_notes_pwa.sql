-- Parish host sites, parish icons, Mass order, and Hopyeong-dong demo Mass.
-- Safe to run repeatedly on MySQL 8.0+.

START TRANSACTION;

ALTER TABLE parishes
  ADD COLUMN IF NOT EXISTS icon_type VARCHAR(100) NULL AFTER homepage,
  ADD COLUMN IF NOT EXISTS icon_data MEDIUMBLOB NULL AFTER icon_type;

ALTER TABLE parish_schedules
  ADD COLUMN IF NOT EXISTS mass_order JSON NULL AFTER schedule_type;

UPDATE parishes
SET parish_code = 'hopyeongdong'
WHERE LOWER(TRIM(parish_code)) IN ('hoppyung', 'hopyung', 'hopyeongdon', 'hoyeongdon');

SET @hopyeong_parish_id := (
  SELECT id FROM parishes
  WHERE LOWER(parish_code) = 'hopyeongdong'
  ORDER BY id
  LIMIT 1
);

INSERT INTO parish_schedules
  (parish_id, schedule_date, start_time, end_time, category, schedule_type,
   mass_order, title, location, content, source_key)
SELECT
  @hopyeong_parish_id, '2026-09-06', '11:00:00', '12:00:00', 'mass', '주일',
  JSON_ARRAY(
    '입당 성가', '성호경', '참회 예식', '자비송', '대영광송', '본기도',
    '제1독서', '화답송', '제2독서', '복음 환호송', '복음', '강론 노트',
    '신앙 고백', '보편 지향 기도', '예물 준비', '예물 기도', '감사송',
    '거룩하시도다', '성찬 기도', '주님의 기도', '평화 예식',
    '하느님의 어린양', '영성체', '영성체송', '영성체 후 기도',
    '강복', '파견', '파견 성가'
  ),
  '교중미사', '호평동 성당 대성전',
  '복음노트와 강론 노트 기능 확인을 위한 더미 미사 일정입니다.',
  'dummy:hopyeongdong:mass:2026-09-06'
WHERE @hopyeong_parish_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM parish_schedules
    WHERE source_key = 'dummy:hopyeongdong:mass:2026-09-06'
  );

UPDATE parish_schedules
SET schedule_date='2026-09-06', start_time='11:00:00', end_time='12:00:00',
    category='mass', schedule_type='주일', title='교중미사',
    location='호평동 성당 대성전',
    content='복음노트와 강론 노트 기능 확인을 위한 더미 미사 일정입니다.',
    mass_order=JSON_ARRAY(
      '입당 성가', '성호경', '참회 예식', '자비송', '대영광송', '본기도',
      '제1독서', '화답송', '제2독서', '복음 환호송', '복음', '강론 노트',
      '신앙 고백', '보편 지향 기도', '예물 준비', '예물 기도', '감사송',
      '거룩하시도다', '성찬 기도', '주님의 기도', '평화 예식',
      '하느님의 어린양', '영성체', '영성체송', '영성체 후 기도',
      '강복', '파견', '파견 성가'
    )
WHERE source_key='dummy:hopyeongdong:mass:2026-09-06'
  AND parish_id=@hopyeong_parish_id;

COMMIT;
