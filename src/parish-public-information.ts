import type { Express } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";

export function registerPublicParishInformation(app: Express, pool: Pool, parishCodeFromHost: (host: string) => string | null) {
  app.get("/api/public/parish-information", async (req, res, next) => {
    try {
      const code = parishCodeFromHost(req.hostname);
      if (!code) return res.status(404).json({ message: "성당 홈페이지에서 이용해 주세요." });
      const [parishes] = await pool.query<RowDataPacket[]>("SELECT id,name,diocese,district,jurisdiction,postal_code AS postalCode,address,address_detail AS addressDetail,phone,office_phone AS officePhone,fax,homepage FROM parishes WHERE LOWER(parish_code)=? AND approval_status='approved' LIMIT 1", [code]);
      const parish = parishes[0];
      if (!parish) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
      const id = parish.id;
      const [[priests], [history], [location], [patron], [guide], [plans]] = await Promise.all([
        pool.query<RowDataPacket[]>("SELECT name,baptismal_name AS baptismalName,role,affiliation FROM parish_priests WHERE parish_id=? AND status='incoming' ORDER BY incoming_date,id", [id]),
        pool.query<RowDataPacket[]>("SELECT event_year AS year,event_month AS month,title,description FROM parish_history WHERE parish_id=? AND enabled=1 ORDER BY event_year DESC,event_month DESC,id DESC", [id]),
        pool.query<RowDataPacket[]>("SELECT transport_guides AS guides FROM parish_location_guides WHERE parish_id=?", [id]),
        pool.query<RowDataPacket[]>("SELECT content_html AS html FROM parish_patron_saint_content WHERE parish_id=?", [id]),
        pool.query<RowDataPacket[]>("SELECT content_html AS html FROM parish_administrative_guide_content WHERE parish_id=?", [id]),
        pool.query<RowDataPacket[]>("SELECT year,content FROM parish_pastoral_goals WHERE parish_id=? ORDER BY year DESC", [id]),
      ]);
      const json = (value: unknown) => typeof value === "string" ? JSON.parse(value) : value;
      res.setHeader("Cache-Control", "no-store");
      res.json({ basic: parish, priests, history, transportGuides: json(location[0]?.guides) ?? [], patronHtml: patron[0]?.html ?? "", guideHtml: guide[0]?.html ?? "", plans: plans.map(row => ({ year: row.year, content: json(row.content) })) });
    } catch (error) { next(error); }
  });
}
