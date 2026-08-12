import crypto from "node:crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();
const SOURCE_URL = "https://missa.cbck.or.kr/Shrines";

function decode(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
    .replace(/&middot;/gi, "·").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim();
}

function parse(html) {
  const updated = html.match(/최종수정일\s*:\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  const sourceUpdatedDate = updated ? `${updated[1]}-${updated[2].padStart(2, "0")}-${updated[3].padStart(2, "0")}` : null;
  const marker = /<div class="rt01pagitem">([\s\S]*?)<\/div>/g;
  const groups = [...html.matchAll(marker)];
  const rows = [];
  let sourceOrder = 0;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const diocese = decode(group[1]);
    const start = group.index + group[0].length;
    const end = groupIndex + 1 < groups.length ? groups[groupIndex + 1].index : html.length;
    const section = html.slice(start, end);
    const cardPattern = /<div class="bs-callout">([\s\S]*?)<\/div>/g;
    for (const cardMatch of section.matchAll(cardPattern)) {
      const card = cardMatch[1];
      const titleMatch = card.match(/<h4>([\s\S]*?)<\/h4>/i);
      if (!titleMatch) continue;
      const name = decode(titleMatch[1]);
      const paragraphs = [...card.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((match) => ({
        text: decode(match[1]),
        href: match[1].match(/<a[^>]+href=["']([^"']+)["']/i)?.[1] ?? null,
      })).filter((item) => item.text);
      const addressIndex = paragraphs.findIndex((item) => !item.href && !/^☎/.test(item.text) && /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]*\d/.test(item.text));
      const address = addressIndex >= 0 ? paragraphs[addressIndex].text : null;
      const phoneNumbers = paragraphs.filter((item) => /^☎/.test(item.text)).map((item) => item.text.replace(/^☎\s*/, ""));
      const websiteUrl = paragraphs.find((item) => item.href)?.href ?? null;
      const notes = paragraphs.filter((item, index) => index !== addressIndex && !/^☎/.test(item.text) && !item.href).map((item) => item.text);
      const sourceHash = crypto.createHash("sha256").update(`${diocese}\0${name}`).digest("hex");
      rows.push({ diocese, name, address, phoneNumbers, websiteUrl, notes, sourceOrder: sourceOrder++, sourceUpdatedDate, sourceHash });
    }
  }
  if (!rows.length || groups.length < 10) throw new Error(`페이지 구조를 인식하지 못했습니다. 교구 ${groups.length}개, 장소 ${rows.length}개`);
  return { rows, sourceUpdatedDate, dioceseCount: groups.length };
}

const response = await fetch(SOURCE_URL, { headers: { "User-Agent": "PaxlinkShrineSync/1.0 (+data synchronization; source attributed)" }, signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`원본 페이지 요청 실패: HTTP ${response.status}`);
const parsed = parse(await response.text());
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, charset: "utf8mb4" });
try {
  await connection.beginTransaction();
  await connection.query(`CREATE TABLE IF NOT EXISTS catholic_shrines (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, diocese VARCHAR(100) NOT NULL, name VARCHAR(300) NOT NULL, address VARCHAR(500) NULL, phone_numbers JSON NOT NULL, website_url VARCHAR(1000) NULL, notes JSON NOT NULL, source_order INT UNSIGNED NOT NULL, source_url VARCHAR(500) NOT NULL, source_updated_date DATE NULL, source_hash CHAR(64) NOT NULL, crawled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uk_shrine_source_hash (source_hash), KEY idx_shrine_diocese_order (diocese, source_order), KEY idx_shrine_name (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await connection.query("CREATE TEMPORARY TABLE shrine_sync_hashes (source_hash CHAR(64) PRIMARY KEY)");
  for (const row of parsed.rows) {
    await connection.execute("INSERT INTO shrine_sync_hashes (source_hash) VALUES (?)", [row.sourceHash]);
    await connection.execute(`INSERT INTO catholic_shrines (diocese, name, address, phone_numbers, website_url, notes, source_order, source_url, source_updated_date, source_hash, crawled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE diocese=VALUES(diocese), name=VALUES(name), address=VALUES(address), phone_numbers=VALUES(phone_numbers), website_url=VALUES(website_url), notes=VALUES(notes), source_order=VALUES(source_order), source_updated_date=VALUES(source_updated_date), crawled_at=NOW()`, [row.diocese, row.name, row.address, JSON.stringify(row.phoneNumbers), row.websiteUrl, JSON.stringify(row.notes), row.sourceOrder, SOURCE_URL, row.sourceUpdatedDate, row.sourceHash]);
  }
  const [deleted] = await connection.execute("DELETE FROM catholic_shrines WHERE source_url = ? AND source_hash NOT IN (SELECT source_hash FROM shrine_sync_hashes)", [SOURCE_URL]);
  await connection.commit();
  console.log(JSON.stringify({ source: SOURCE_URL, sourceUpdatedDate: parsed.sourceUpdatedDate, dioceses: parsed.dioceseCount, shrines: parsed.rows.length, staleRowsDeleted: deleted.affectedRows }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
