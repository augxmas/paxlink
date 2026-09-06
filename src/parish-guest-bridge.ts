import type { RequestHandler } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
// Only this verified, GET-only bridge can set publicGuest. No session is created.
export function guestReadBridge(pool:Pool):RequestHandler {
  const allowed=[/^(notices|notices\/popups\/active|groups|videos|parish-information|location-guide|patron-saint|pastoral-goals|dictionary\/categories|dictionary\/terms|prayer-dream|memorials|catacomb\/posts|talent\/missions|shrine-reviews|shrine-reviews\/community-summary|legion\/organizations|suggestions)$/,
    /^notices\/\d+\/attachments\/[12]$/, /^groups\/\d+\/icon$/, /^memorials\/\d+$/, /^memorial-photos\/\d+$/, /^shrine-reviews\/\d+\/community$/, /^shrine-photos\/\d+\/image$/, /^missions\/\d+\/(community|icon)$/, /^schedules\/\d+\/attachment$/];
  return async(req,res,next)=>{
    if(!req.path.startsWith('/api/public/member/'))return next();
    if(req.method!=='GET')return res.status(401).json({message:'로그인 후 이용해 주세요.'});
    if(req.hostname.toLowerCase()!=='paxlink.kr')return res.sendStatus(404);
    const id=Number(req.query.parishId);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:'성당을 선택해 주세요.'});
    try {
      const [parishes]=await pool.query<RowDataPacket[]>("SELECT id,name FROM parishes WHERE id=? AND approval_status='approved'",[id]);if(!parishes.length)return res.sendStatus(404);
      const route=req.path.slice('/api/public/member/'.length);res.setHeader('Cache-Control','no-store');
      if(['grace-diaries','group-membership-results','missions/mine','prayer-dream/clergy-targets','suggestions-editable'].includes(route)||/^shrines\/\d+\/photos$/.test(route))return res.json([]);
      if(route==='notifications')return res.json({items:[],unreadCount:0});
      if(route==='profile')return res.json({name:'방문자',baptismalName:null,guest:true});
      if(route==='shrines'){
        const [rows]=await pool.query<RowDataPacket[]>('SELECT id,diocese,name,address,website_url AS websiteUrl FROM catholic_shrines WHERE enabled=1 ORDER BY diocese,source_order,name');
        return res.json(rows.map(row=>({...row,id:Number(row.id),visited:false,visitId:null,visitedDate:null,photoCount:0,reviewCount:0,visitorNames:[]})));
      }
      if(route==='schedules'){
        const month=String(req.query.month??'');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.sendStatus(400);
        const [rows]=await pool.query<RowDataPacket[]>("SELECT id,DATE_FORMAT(schedule_date,'%Y-%m-%d') AS scheduleDate,TIME_FORMAT(start_time,'%H:%i') AS startTime,TIME_FORMAT(end_time,'%H:%i') AS endTime,category,schedule_type AS scheduleType,mass_order AS massOrder,title,location,content,attachment_name AS attachmentName FROM parish_schedules WHERE parish_id=? AND schedule_date>=CONCAT(?,'-01') AND schedule_date<DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH) ORDER BY schedule_date,start_time,id",[id,month,month]);
        return res.json(rows.map(row=>{let order=row.massOrder;if(typeof order==='string'){try{order=JSON.parse(order)}catch{order=[]}}return {...row,id:Number(row.id),massOrder:Array.isArray(order)?order:[]}}));
      }
      if(!allowed.some(pattern=>pattern.test(route)))return res.status(401).json({message:'로그인 후 이용해 주세요.'});
      const icon=route.match(/^(groups|missions)\/(\d+)\/icon$/);
      if(icon){const [rows]=await pool.query<RowDataPacket[]>(`SELECT id FROM ${icon[1]==='groups'?'parish_groups':'sharing_missions'} WHERE id=? AND parish_id=? AND status='approved'`,[Number(icon[2]),id]);if(!rows.length)return res.sendStatus(404)}
      res.locals.publicGuest=true;res.locals.parishioner={parish_id:id,user_key:'guest:',name:'방문자',email:'',parish_name:parishes[0]!.name};
      if(route==='groups'){
        const json=res.json.bind(res);res.json=((body:unknown)=>json(Array.isArray(body)?body.map(row=>({...row,applicationCount:0,withdrawalCount:0})):body)) as typeof res.json;
      }
      req.url='/api/parishioner/'+route+(req.url.includes('?')?req.url.slice(req.url.indexOf('?')):'');next();
    }catch(e){next(e)}
  };
}
