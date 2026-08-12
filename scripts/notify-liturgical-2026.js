import "dotenv/config";
import mysql from "mysql2/promise";
const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
try{
  const parishId=Number(process.argv[2]||1);
  const [result]=await db.execute(`INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type)
    SELECT ?,p.id,'liturgical_calendar_import','2026년 전례력 등록','2026년 전례력 85건이 성당 일정에 등록되었습니다.','schedule'
    FROM parishioners p WHERE p.parish_id=? AND NOT EXISTS (
      SELECT 1 FROM parishioner_notifications n WHERE n.parishioner_id=p.id AND n.category='liturgical_calendar_import'
    )`,[parishId,parishId]);
  console.log(JSON.stringify({notifications:result.affectedRows}));
}finally{await db.end()}
