import type { Express, RequestHandler } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";

export type TransportGuide = { mode: string; route: string; details: string };

export function parseTransportGuides(value: unknown): TransportGuide[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error("교통편은 최대 30개까지 등록할 수 있습니다.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("교통편 입력 내용을 확인해 주세요.");
    const { mode, route, details } = item as Record<string, unknown>;
    if (typeof mode !== "string" || typeof route !== "string" || typeof details !== "string") throw new Error("교통편 입력 내용을 확인해 주세요.");
    const guide = { mode: mode.trim(), route: route.trim(), details: details.trim() };
    if (!guide.mode || guide.mode.length > 80 || guide.route.length > 160 || !guide.details || guide.details.length > 2000) {
      throw new Error(`${index + 1}번째 교통편의 이용수단(80자 이내), 노선(160자 이내), 상세안내(2,000자 이내)를 확인해 주세요.`);
    }
    return guide;
  });
}

export async function ensureParishLocationSchema(pool: Pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_location_guides (
    parish_id BIGINT UNSIGNED PRIMARY KEY,
    transport_guides JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_location_guide_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

export function registerParishLocationRoutes(app: Express, pool: Pool, requireParish: RequestHandler) {
  app.get("/api/parish/location-guide", requireParish, async (_req, res, next) => {
    try {
      const parishId = Number(res.locals.parishSession.parish_id);
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.name, p.address, p.address_detail AS addressDetail,
        g.transport_guides AS transportGuides, g.updated_at AS updatedAt
        FROM parishes p LEFT JOIN parish_location_guides g ON g.parish_id=p.id WHERE p.id=?`, [parishId]);
      const row = rows[0];
      if (!row) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
      res.setHeader("Cache-Control", "no-store");
      res.json({ name: row.name, address: row.address ?? "", addressDetail: row.addressDetail ?? "",
        transportGuides: typeof row.transportGuides === "string" ? JSON.parse(row.transportGuides) : row.transportGuides ?? [], updatedAt: row.updatedAt ?? null });
    } catch (error) { next(error); }
  });
  app.put("/api/parish/location-guide", requireParish, async (req, res, next) => {
    let guides: TransportGuide[];
    try { guides = parseTransportGuides(req.body?.transportGuides); }
    catch (error) { return res.status(400).json({ message: (error as Error).message }); }
    try {
      const parishId = Number(res.locals.parishSession.parish_id);
      await pool.execute(`INSERT INTO parish_location_guides (parish_id, transport_guides) VALUES (?,?)
        ON DUPLICATE KEY UPDATE transport_guides=VALUES(transport_guides)`, [parishId, JSON.stringify(guides)]);
      res.json({ message: "위치 안내가 저장되었습니다." });
    } catch (error) { next(error); }
  });
}
