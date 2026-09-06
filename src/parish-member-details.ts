import type { Express, RequestHandler } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";

export function registerMemberParishDetails(app: Express, pool: Pool, requireParishioner: RequestHandler) {
  app.get("/api/parishioner/pastoral-goals", requireParishioner, async (_req, res, next) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT year, content FROM parish_pastoral_goals WHERE parish_id=? ORDER BY year DESC",
        [Number(res.locals.parishioner.parish_id)]);
      res.setHeader("Cache-Control", "no-store");
      res.json({ plans: rows.map(row => ({ year: row.year, content: typeof row.content === "string" ? JSON.parse(row.content) : row.content })) });
    } catch (error) { next(error); }
  });
  app.get("/api/parishioner/location-guide", requireParishioner, async (_req, res, next) => {
    try {
      const parishId = Number(res.locals.parishioner.parish_id);
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.name, p.address, p.address_detail AS addressDetail,
        g.transport_guides AS transportGuides FROM parishes p
        LEFT JOIN parish_location_guides g ON g.parish_id=p.id WHERE p.id=?`, [parishId]);
      const row = rows[0];
      if (!row) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
      res.setHeader("Cache-Control", "no-store");
      res.json({ name: row.name, address: row.address ?? "", addressDetail: row.addressDetail ?? "",
        transportGuides: typeof row.transportGuides === "string" ? JSON.parse(row.transportGuides) : row.transportGuides ?? [] });
    } catch (error) { next(error); }
  });
  app.get("/api/parishioner/patron-saint", requireParishioner, async (_req, res, next) => {
    try {
      const parishId = Number(res.locals.parishioner.parish_id);
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.name, c.content_html AS contentHtml
        FROM parishes p LEFT JOIN parish_patron_saint_content c ON c.parish_id=p.id WHERE p.id=?`, [parishId]);
      const row = rows[0];
      if (!row) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
      res.setHeader("Cache-Control", "no-store");
      res.json({ name: row.name, contentHtml: row.contentHtml ?? "" });
    } catch (error) { next(error); }
  });
}
