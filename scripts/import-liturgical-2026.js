import "dotenv/config";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
try{
  const parishId=Number(process.argv[2]||1);
  const [parishes]=await db.query("SELECT id,name FROM parishes WHERE id=? AND approval_status='approved'",[parishId]);
  if(!parishes.length)throw new Error("승인된 성당을 찾을 수 없습니다.");
  const [columns]=await db.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_schedules'");
  if(!columns.some(row=>row.COLUMN_NAME==="source_key"))await db.query("ALTER TABLE parish_schedules ADD COLUMN source_key VARCHAR(255) NULL AFTER content");
  const [indexes]=await db.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_schedules' AND INDEX_NAME='uk_parish_schedule_source'");
  if(!indexes.length)await db.query("ALTER TABLE parish_schedules ADD UNIQUE KEY uk_parish_schedule_source (parish_id,source_key)");
  const response=await fetch("https://gist.githubusercontent.com/search5/fffbf534fe818d099e9e242c7684e9a1/raw/catholic_2026_ical.ics");
  if(!response.ok)throw new Error(`전례력 다운로드 실패: ${response.status}`);
  const lines=(await response.text()).replace(/\r\n/g,"\n").split("\n").reduce((result,line)=>{if(/^[ \t]/.test(line)&&result.length)result[result.length-1]+=line.slice(1);else result.push(line);return result},[]);
  const decode=value=>String(value||"").replace(/\\n/gi,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\").trim();
  const events=[];let current=null;
  for(const line of lines){if(line==="BEGIN:VEVENT"){current={};continue}if(line==="END:VEVENT"&&current){const date=String(current.DTSTART||"").replace(/\D/g,"").slice(0,8);if(current.SUMMARY&&/^2026\d{4}$/.test(date))events.push({title:decode(current.SUMMARY),date:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,description:decode(current.DESCRIPTION)});current=null;continue}if(current){const index=line.indexOf(":");if(index>0)current[line.slice(0,index).split(";")[0]]=line.slice(index+1)}}
  await db.beginTransaction();let imported=0,skipped=0;
  for(const event of events){const key=`liturgical-2026:${event.date}:${crypto.createHash("sha1").update(event.title).digest("hex").slice(0,16)}`;const [result]=await db.execute("INSERT IGNORE INTO parish_schedules (parish_id,schedule_date,category,title,content,source_key) VALUES (?,?,'liturgical',?,?,?)",[parishId,event.date,event.title,[event.description,"출처: 한국가톨릭 서울대교구 2026년 전례력"].filter(Boolean).join("\n"),key]);result.affectedRows?imported++:skipped++}
  await db.commit();console.log(JSON.stringify({parish:parishes[0].name,total:events.length,imported,skipped}));
}catch(error){await db.rollback();throw error}finally{await db.end()}
