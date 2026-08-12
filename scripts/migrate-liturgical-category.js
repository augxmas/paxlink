import "dotenv/config";
import mysql from "mysql2/promise";

const parishId=Number(process.argv[2]||1);
const db=await mysql.createConnection({
  host:process.env.DB_HOST||"localhost",
  port:Number(process.env.DB_PORT||3306),
  user:process.env.DB_USER||"root",
  password:process.env.DB_PASSWORD||"",
  database:process.env.DB_NAME||"paxlink",
});

try{
  await db.query("ALTER TABLE parish_schedules MODIFY category ENUM('mass','sacrament','devotion','liturgical','other') NOT NULL DEFAULT 'other'");
  const [result]=await db.execute("UPDATE parish_schedules SET category='liturgical' WHERE parish_id=? AND source_key LIKE 'liturgical-2026:%'",[parishId]);
  const [rows]=await db.execute("SELECT COUNT(*) AS count FROM parish_schedules WHERE parish_id=? AND category='liturgical' AND source_key LIKE 'liturgical-2026:%'",[parishId]);
  console.log(JSON.stringify({parishId,changed:result.affectedRows,liturgicalCount:Number(rows[0]?.count||0)}));
}finally{
  await db.end();
}
