import type { Express, RequestHandler } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";
export function registerPublicFaith(app: Express, pool: Pool, hostCode: (host: string) => string | null) {
  app.get('/api/public/faith-parishes',async(_req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT id,name,diocese FROM parishes WHERE approval_status='approved' ORDER BY name,id");res.setHeader('Cache-Control','no-store');res.json(rows)}catch(e){next(e)}});
  const scope: RequestHandler = async (req,res,next) => {
    try { const code=hostCode(req.hostname),apex=req.hostname.toLowerCase().replace(/\.$/,'')==='paxlink.kr';if(!code&&!apex)return res.sendStatus(404);
      const id=Number(req.query.parishId);if(!code&&(!Number.isSafeInteger(id)||id<1))return res.status(400).json({message:'성당을 선택해 주세요.'});
      const [rows]=await pool.query<RowDataPacket[]>(`SELECT id,name FROM parishes WHERE ${code?'LOWER(parish_code)':'id'}=? AND approval_status='approved' LIMIT 1`,[code||id]);
      if(!rows.length)return res.sendStatus(404);res.locals.publicParish=rows[0];res.setHeader('Cache-Control','no-store');next();
    } catch(e){next(e)}
  };
  app.get('/api/public/faith/:kind',scope,async(req,res,next)=>{
    try {const parish=res.locals.publicParish,id=parish.id;let items:RowDataPacket[]=[];
      if(req.params.kind==='home'&&req.hostname.toLowerCase()==='paxlink.kr'){
        const month=String(req.query.month??'');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({message:'조회할 월을 확인해 주세요.'});
        const [[notices],[schedules]]=await Promise.all([
          pool.query<RowDataPacket[]>('SELECT id,title,content FROM parish_notices WHERE parish_id=? ORDER BY pinned DESC,created_at DESC,id DESC',[id]),
          pool.query<RowDataPacket[]>("SELECT id,title,content,DATE_FORMAT(schedule_date,'%Y-%m-%d') AS scheduleDate,TIME_FORMAT(start_time,'%H:%i') AS startTime,location FROM parish_schedules WHERE parish_id=? AND schedule_date>=CONCAT(?,'-01') AND schedule_date<DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH) ORDER BY schedule_date,start_time,id",[id,month,month])]);
        return res.json({name:parish.name,items:schedules,notices});
      }else if(req.params.kind==='prayer-dream'){
        [items]=await pool.query<RowDataPacket[]>("SELECT id,prayer_text AS content,created_at AS createdAt FROM prayer_dreams WHERE parish_id=? AND is_public=1 ORDER BY created_at DESC,id DESC",[id]);
        const [comments]=await pool.query<RowDataPacket[]>("SELECT c.prayer_id AS prayerId,c.content,c.created_at AS createdAt FROM prayer_dream_comments c JOIN prayer_dreams d ON d.id=c.prayer_id WHERE d.parish_id=? AND d.is_public=1 ORDER BY c.created_at,c.id",[id]);
        items=items.map(p=>({...p,comments:comments.filter(c=>Number(c.prayerId)===Number(p.id))})) as RowDataPacket[];
      }else if(req.params.kind==='memorial'){
        [items]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,biography,DATE_FORMAT(death_date,'%Y-%m-%d') AS deathDate FROM memorials WHERE parish_id=? AND organization_id IS NULL AND status='approved' ORDER BY created_at DESC,id DESC",[id]);
      }else if(req.params.kind==='gospel-note'){
        const month=String(req.query.month??'');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({message:'조회할 월을 확인해 주세요.'});
        [items]=await pool.query<RowDataPacket[]>("SELECT id,title,content,DATE_FORMAT(schedule_date,'%Y-%m-%d') AS scheduleDate,TIME_FORMAT(start_time,'%H:%i') AS startTime,location,mass_order AS massOrder FROM parish_schedules WHERE parish_id=? AND category='mass' AND schedule_date>=CONCAT(?,'-01') AND schedule_date<DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH) ORDER BY schedule_date,start_time,id",[id,month,month]);
        items=items.map(row=>({...row,massOrder:typeof row.massOrder==='string'?JSON.parse(row.massOrder):row.massOrder??[]})) as RowDataPacket[];
      }else return res.sendStatus(404);
      res.json({name:parish.name,items});
    }catch(e){next(e)}
  });
  app.get('/api/public/faith/memorial/:id',scope,async(req,res,next)=>{
    try {const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.sendStatus(404);
      const [rows]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,history_text AS historyText,ordination_text AS ordinationText,biography,DATE_FORMAT(death_date,'%Y-%m-%d') AS deathDate FROM memorials WHERE id=? AND parish_id=? AND organization_id IS NULL AND status='approved' LIMIT 1",[id,res.locals.publicParish.id]);
      if(!rows.length)return res.sendStatus(404);
      const [[photos],[entries]]=await Promise.all([pool.query<RowDataPacket[]>('SELECT id FROM memorial_photos WHERE memorial_id=? ORDER BY display_order,id',[id]),pool.query<RowDataPacket[]>('SELECT entry_type AS entryType,content,created_at AS createdAt FROM memorial_entries WHERE memorial_id=? ORDER BY created_at,id',[id])]);
      res.json({...rows[0],photos:photos.map(p=>`/api/public/faith/memorial-photo/${p.id}?parishId=${res.locals.publicParish.id}`),entries});
    }catch(e){next(e)}
  });
  app.get('/api/public/faith/memorial-photo/:id',scope,async(req,res,next)=>{
    try {const [rows]=await pool.query<RowDataPacket[]>("SELECT p.image_type,p.image_data FROM memorial_photos p JOIN memorials m ON m.id=p.memorial_id WHERE p.id=? AND m.parish_id=? AND m.organization_id IS NULL AND m.status='approved' LIMIT 1",[Number(req.params.id),res.locals.publicParish.id]);if(!rows.length)return res.sendStatus(404);res.type(rows[0]!.image_type);res.send(rows[0]!.image_data)}catch(e){next(e)}
  });
}
