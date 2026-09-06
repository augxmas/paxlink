import type { Express, RequestHandler } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";

export function parsePastoralPlan(value: any) {
  const str = (v: unknown, max: number, required = false): string => {
    if (typeof v !== "string" || v.trim().length > max || (required && !v.trim())) throw new Error("필수 항목과 입력 길이를 확인해 주세요.");
    return v.trim();
  };
  if (!value || !Array.isArray(value.goals) || value.goals.length > 30) throw new Error("중점 목표는 최대 30개까지 등록할 수 있습니다.");
  return { theme: str(value.theme, 200, true), scripture: str(value.scripture, 1000), direction: str(value.direction, 10000),
    goals: value.goals.map((g: any) => ({ area: str(g?.area, 80), title: str(g?.title, 300, true), plan: str(g?.plan, 5000) })) };
}
export async function ensureParishPastoralSchema(pool: Pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_pastoral_goals (
    parish_id BIGINT UNSIGNED NOT NULL, year SMALLINT UNSIGNED NOT NULL, content JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (parish_id, year),
    CONSTRAINT fk_pastoral_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
export function registerParishPastoralRoutes(app: Express, pool: Pool, auth: RequestHandler) {
  const path = "/api/parish/pastoral-goals/:year";
  const validate: RequestHandler = (req, res, next) => {
    if (!/^\d{4}$/.test(String(req.params.year)) || Number(req.params.year) < 1900 || Number(req.params.year) > 2200) return res.status(400).json({ message: "연도는 1900~2200 사이로 입력해 주세요." });
    next();
  };
  app.get(path, auth, validate, async (req, res, next) => {
    try {
      const id = res.locals.parishSession.parish_id;
      const [rows] = await pool.query<RowDataPacket[]>("SELECT content, updated_at AS updatedAt FROM parish_pastoral_goals WHERE parish_id=? AND year=?", [id, Number(req.params.year)]);
      const [years] = await pool.query<RowDataPacket[]>("SELECT year FROM parish_pastoral_goals WHERE parish_id=? ORDER BY year DESC", [id]);
      res.setHeader("Cache-Control", "no-store");
      res.json({ content: rows[0] ? (typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content) : null, updatedAt: rows[0]?.updatedAt ?? null, years: years.map(row => row.year) });
    } catch (e) { next(e); }
  });
  app.put(path, auth, validate, async (req, res, next) => {
    let content;
    try { content = parsePastoralPlan(req.body); } catch (e) { return res.status(400).json({ message: (e as Error).message }); }
    try {
      await pool.execute("INSERT INTO parish_pastoral_goals (parish_id,year,content) VALUES (?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content)", [res.locals.parishSession.parish_id, Number(req.params.year), JSON.stringify(content)]);
      res.json({ message: "사목 목표를 저장했습니다." });
    } catch (e) { next(e); }
  });
  app.delete(path, auth, validate, async (req, res, next) => {
    try {
      await pool.execute("DELETE FROM parish_pastoral_goals WHERE parish_id=? AND year=?", [res.locals.parishSession.parish_id, Number(req.params.year)]);
      res.json({ message: "해당 연도의 사목 목표를 삭제했습니다." });
    } catch (e) { next(e); }
  });
}
