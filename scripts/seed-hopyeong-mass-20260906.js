import "dotenv/config";
import mysql from "mysql2/promise";

const pool=mysql.createPool({
  host:process.env.DB_HOST,
  port:Number(process.env.DB_PORT||3306),
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  database:process.env.DB_NAME,
  charset:"utf8mb4"
});

try{
  const [parishes]=await pool.query("SELECT id,name FROM parishes WHERE LOWER(parish_code)='hopyeongdong' AND approval_status='approved' LIMIT 1");
  if(!parishes.length)throw new Error("승인된 호평동 성당을 찾을 수 없습니다.");
  const parishId=Number(parishes[0].id),sourceKey="dummy:hopyeongdong:mass:2026-09-06";
  const massOrder=["입당 성가","성호경","참회 예식","자비송","대영광송","본기도","제1독서","화답송","제2독서","복음 환호송","복음","강론 노트","신앙 고백","보편 지향 기도","예물 준비","예물 기도","감사송","거룩하시도다","성찬 기도","주님의 기도","평화 예식","하느님의 어린양","영성체","영성체송","영성체 후 기도","강복","파견","파견 성가"];
  await pool.execute(`INSERT INTO parish_schedules
    (parish_id,schedule_date,start_time,end_time,category,schedule_type,mass_order,title,location,content,source_key)
    VALUES (?,'2026-09-06','11:00:00','12:00:00','mass','주일',?,'교중미사','호평동 성당 대성전','복음노트와 강론 노트 기능 확인을 위한 더미 미사 일정입니다.',?)
    ON DUPLICATE KEY UPDATE start_time=VALUES(start_time),end_time=VALUES(end_time),category=VALUES(category),schedule_type=VALUES(schedule_type),mass_order=VALUES(mass_order),title=VALUES(title),location=VALUES(location),content=VALUES(content)`,[parishId,JSON.stringify(massOrder),sourceKey]);
  const [rows]=await pool.query("SELECT id,DATE_FORMAT(schedule_date,'%Y-%m-%d') AS scheduleDate,TIME_FORMAT(start_time,'%H:%i') AS startTime,title,schedule_type AS scheduleType,mass_order AS massOrder FROM parish_schedules WHERE parish_id=? AND source_key=?",[parishId,sourceKey]);
  console.log(JSON.stringify({parish:parishes[0].name,schedule:rows[0]},null,2));
}finally{
  await pool.end();
}
