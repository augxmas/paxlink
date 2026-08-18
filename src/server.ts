import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import mysql, { RowDataPacket } from "mysql2/promise";
import nodemailer from "nodemailer";

dotenv.config();

function groupPayload(body:Record<string,unknown>){return{nameKo:String(body.nameKo??"").trim(),nameEn:String(body.nameEn??"").trim(),description:String(body.description??"").trim(),regularMeeting:String(body.regularMeeting??"").trim(),iconType:String(body.iconType??""),iconData:String(body.iconData??"")}}
function groupErrors(value:ReturnType<typeof groupPayload>){const errors:Record<string,string>={};if(!value.nameKo)errors.nameKo="단체명(국문)을 입력해 주세요.";else if(value.nameKo.length>200)errors.nameKo="단체명은 200자 이내로 입력해 주세요.";if(value.nameEn.length>300)errors.nameEn="영문 단체명은 300자 이내로 입력해 주세요.";if(value.iconData&&Buffer.byteLength(value.iconData,"base64")>2*1024*1024)errors.icon="아이콘 이미지는 2MB까지 업로드할 수 있습니다.";if(value.iconData&&!/^image\//.test(value.iconType))errors.icon="이미지 파일만 업로드할 수 있습니다.";if(value.regularMeeting){try{const schedules=JSON.parse(value.regularMeeting) as Array<{day?:string;from?:string;to?:string}>;const validDays=new Set(["mon","tue","wed","thu","fri","sat","sun"]);if(!Array.isArray(schedules)||schedules.some(item=>!validDays.has(String(item.day))||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(item.from))||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(item.to))||String(item.from)>=String(item.to)))errors.regularMeeting="선택한 요일의 시작·종료 시간을 확인해 주세요."}catch{errors.regularMeeting="정기미팅 정보를 확인해 주세요."}}return errors}
function displayMeeting(raw:unknown){if(!raw)return"";try{const labels:Record<string,string>={mon:"월",tue:"화",wed:"수",thu:"목",fri:"금",sat:"토",sun:"일"};return(JSON.parse(String(raw)) as Array<{day:string;from:string;to:string}>).map(item=>`${labels[item.day]??item.day} ${item.from}~${item.to}`).join(", ")}catch{return String(raw)}}
function groupDto(row:RowDataPacket){return{id:Number(row.id),nameKo:row.name_ko,nameEn:row.name_en,description:row.description,regularMeeting:displayMeeting(row.regular_meeting),operatorName:row.operator_name,status:row.status,hasIcon:Boolean(row.has_icon??row.icon_data),memberCount:Number(row.member_count??0),applicationCount:Number(row.application_count??0),createdAt:row.created_at,approvedAt:row.approved_at}}

const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: Math.max(1, Number(process.env.DB_CONNECTION_LIMIT ?? 1)),
  maxIdle: Math.max(1, Number(process.env.DB_MAX_IDLE ?? 1)),
  idleTimeout: 60_000,
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS parishes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    diocese VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_parishes_name_diocese (name, diocese),
    KEY idx_parishes_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NULL,
    email VARCHAR(254) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_parish_admin (parish_id, email),
    CONSTRAINT fk_admin_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_login_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(254) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_login_lookup (parish_id, email, created_at),
    CONSTRAINT fk_code_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const parishColumns: Record<string, string> = {
    parish_code: "VARCHAR(40) NULL",
    phone: "VARCHAR(13) NULL",
    postal_code: "VARCHAR(10) NULL",
    address: "VARCHAR(255) NULL",
    address_detail: "VARCHAR(255) NULL",
    district: "VARCHAR(120) NULL",
    jurisdiction: "VARCHAR(120) NULL",
    office_phone: "VARCHAR(13) NULL",
    fax: "VARCHAR(13) NULL",
    homepage: "VARCHAR(500) NULL",
    approval_requested_at: "DATETIME NULL DEFAULT CURRENT_TIMESTAMP",
    approval_status: "VARCHAR(20) NOT NULL DEFAULT 'pending'",
    cancellation_reason: "VARCHAR(1000) NULL",
    modified_by: "VARCHAR(100) NULL",
    modified_at: "DATETIME NULL",
  };
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parishes'",
  );
  const names = new Set(existing.map((row) => String(row.COLUMN_NAME)));
  for (const [name, definition] of Object.entries(parishColumns)) {
    if (!names.has(name)) await pool.query(`ALTER TABLE parishes ADD COLUMN ${name} ${definition}`);
  }
  const [indexes] = await pool.query<RowDataPacket[]>("SHOW INDEX FROM parishes WHERE Key_name = 'uk_parish_code'");
  if (!indexes.length) await pool.query("ALTER TABLE parishes ADD UNIQUE KEY uk_parish_code (parish_code)");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_registration_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    manager_name VARCHAR(100) NULL,
    email VARCHAR(254) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    token_hash CHAR(64) NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,
    consumed_at DATETIME NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_registration_lookup (email, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const relatedColumns: Array<[string, string, string]> = [
    ["parish_admins", "name", "VARCHAR(100) NULL"],
    ["parish_registration_codes", "manager_name", "VARCHAR(100) NULL"],
  ];
  for (const [table, column, definition] of relatedColumns) {
    const [found] = await pool.query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, column],
    );
    if (!found.length) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS login_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL,
    user_key VARCHAR(254) NOT NULL,
    parish_id BIGINT UNSIGNED NULL,
    token_hash CHAR(64) NOT NULL,
    logged_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    logged_out_at DATETIME NULL,
    logout_reason VARCHAR(20) NULL,
    ip_address VARCHAR(45) NOT NULL,
    UNIQUE KEY uk_login_token (token_hash),
    KEY idx_login_user (user_type, user_key, logged_out_at),
    CONSTRAINT fk_session_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_priests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NULL,
    baptismal_name VARCHAR(100) NULL,
    role VARCHAR(20) NULL,
    appointment_date DATE NULL,
    affiliation VARCHAR(150) NULL,
    generation INT UNSIGNED NULL,
    birth_date DATE NULL,
    mobile VARCHAR(13) NULL,
    email VARCHAR(254) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'incoming',
    incoming_date DATE NOT NULL,
    outgoing_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_priest_parish (parish_id, status),
    CONSTRAINT fk_priest_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_priest_field_settings (
    parish_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(40) NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    required_field TINYINT(1) NOT NULL DEFAULT 0,
    searchable TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (parish_id, field_key),
    CONSTRAINT fk_priest_setting_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [priestSettingColumns] = await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parish_priest_field_settings'");
  const priestSettingColumnNames = new Set(priestSettingColumns.map((row) => String(row.COLUMN_NAME)));
  if (!priestSettingColumnNames.has("display_order")) await pool.query("ALTER TABLE parish_priest_field_settings ADD COLUMN display_order INT UNSIGNED NOT NULL DEFAULT 0");
  if (!priestSettingColumnNames.has("alignment")) await pool.query("ALTER TABLE parish_priest_field_settings ADD COLUMN alignment VARCHAR(10) NOT NULL DEFAULT 'left'");
  if (!priestSettingColumnNames.has("frozen")) await pool.query("ALTER TABLE parish_priest_field_settings ADD COLUMN frozen TINYINT(1) NOT NULL DEFAULT 0");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_priest_setting_revisions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    revision_no INT UNSIGNED NOT NULL,
    settings_json TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_priest_revision (parish_id, revision_no),
    KEY idx_priest_revision_active (parish_id, is_active),
    CONSTRAINT fk_priest_revision_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_nuns LIKE parish_priests`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_nun_field_settings LIKE parish_priest_field_settings`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_nun_setting_revisions LIKE parish_priest_setting_revisions`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    event_year SMALLINT UNSIGNED NOT NULL,
    event_month TINYINT UNSIGNED NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_history_parish_date (parish_id, event_year, event_month),
    CONSTRAINT fk_history_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_history_preferences (
    parish_id BIGINT UNSIGNED PRIMARY KEY,
    sort_direction VARCHAR(4) NOT NULL DEFAULT 'desc',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_preference_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_patron_saint_content (
    parish_id BIGINT UNSIGNED PRIMARY KEY,
    content_html MEDIUMTEXT NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_patron_saint_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_administrative_guide_content (
    parish_id BIGINT UNSIGNED PRIMARY KEY,
    content_html MEDIUMTEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_administrative_guide_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_videos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    video_id VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    author_name VARCHAR(300) NULL,
    thumbnail_url VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_parish_video (parish_id, video_id),
    KEY idx_parish_video_created (parish_id, created_at),
    CONSTRAINT fk_video_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [videoColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_videos'");
  if(!videoColumns.some(row=>String(row.COLUMN_NAME)==="tags"))await pool.query("ALTER TABLE parish_videos ADD COLUMN tags VARCHAR(1000) NULL AFTER thumbnail_url");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL,
    schedule_date DATE NOT NULL, start_time TIME NULL, end_time TIME NULL,
    category ENUM('mass','sacrament','devotion','liturgical','other') NOT NULL DEFAULT 'other',
    schedule_type VARCHAR(50) NULL, title VARCHAR(200) NOT NULL, location VARCHAR(300) NULL, content VARCHAR(5000) NULL, source_key VARCHAR(255) NULL,
    attachment_name VARCHAR(500) NULL, attachment_type VARCHAR(200) NULL, attachment_data MEDIUMBLOB NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_parish_schedule (parish_id,schedule_date,start_time),
    CONSTRAINT fk_schedule_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [scheduleColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_schedules'");
  await pool.query("UPDATE parish_schedules SET category='other' WHERE category='meeting'");
  await pool.query("ALTER TABLE parish_schedules MODIFY category ENUM('mass','sacrament','devotion','liturgical','other') NOT NULL DEFAULT 'other'");
  if(!scheduleColumns.some(row=>String(row.COLUMN_NAME)==="schedule_type"))await pool.query("ALTER TABLE parish_schedules ADD COLUMN schedule_type VARCHAR(50) NULL AFTER category");
  if(!scheduleColumns.some(row=>String(row.COLUMN_NAME)==="location"))await pool.query("ALTER TABLE parish_schedules ADD COLUMN location VARCHAR(300) NULL AFTER title");
  if(!scheduleColumns.some(row=>String(row.COLUMN_NAME)==="source_key"))await pool.query("ALTER TABLE parish_schedules ADD COLUMN source_key VARCHAR(255) NULL AFTER content");
  if(!scheduleColumns.some(row=>String(row.COLUMN_NAME)==="attachment_name"))await pool.query("ALTER TABLE parish_schedules ADD COLUMN attachment_name VARCHAR(500) NULL AFTER source_key");
  if(!scheduleColumns.some(row=>String(row.COLUMN_NAME)==="attachment_type"))await pool.query("ALTER TABLE parish_schedules ADD COLUMN attachment_type VARCHAR(200) NULL AFTER attachment_name");
  if(!scheduleColumns.some(row=>String(row.COLUMN_NAME)==="attachment_data"))await pool.query("ALTER TABLE parish_schedules ADD COLUMN attachment_data MEDIUMBLOB NULL AFTER attachment_type");
  await pool.query("UPDATE parish_schedules SET category='liturgical' WHERE source_key LIKE 'liturgical-2026:%'");
  const [scheduleIndexes]=await pool.query<RowDataPacket[]>("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_schedules' AND INDEX_NAME='uk_parish_schedule_source'");
  if(!scheduleIndexes.length)await pool.query("ALTER TABLE parish_schedules ADD UNIQUE KEY uk_parish_schedule_source (parish_id,source_key)");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_notices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    pinned TINYINT(1) NOT NULL DEFAULT 0,
    popup_enabled TINYINT(1) NOT NULL DEFAULT 0,
    popup_from DATE NULL,
    popup_to DATE NULL,
    attachment1_name VARCHAR(500) NULL,
    attachment1_type VARCHAR(200) NULL,
    attachment1_data MEDIUMBLOB NULL,
    attachment2_name VARCHAR(500) NULL,
    attachment2_type VARCHAR(200) NULL,
    attachment2_data MEDIUMBLOB NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_notice_parish_order (parish_id, pinned, created_at),
    CONSTRAINT fk_notice_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS catholic_shrines (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    diocese VARCHAR(100) NOT NULL,
    name VARCHAR(300) NOT NULL,
    address VARCHAR(500) NULL,
    phone_numbers JSON NOT NULL,
    website_url VARCHAR(1000) NULL,
    notes JSON NOT NULL,
    source_order INT UNSIGNED NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    source_updated_date DATE NULL,
    source_hash CHAR(64) NOT NULL,
    crawled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_shrine_source_hash (source_hash),
    KEY idx_shrine_diocese_order (diocese, source_order),
    KEY idx_shrine_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [shrineColumns] = await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catholic_shrines'");
  if (!shrineColumns.some((row) => String(row.COLUMN_NAME) === "enabled")) await pool.query("ALTER TABLE catholic_shrines ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER notes");
  await pool.query(`CREATE TABLE IF NOT EXISTS parishioners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL, baptismal_name VARCHAR(100) NULL, email VARCHAR(254) NOT NULL,
    birth_date DATE NOT NULL, phone VARCHAR(13) NOT NULL, mobile VARCHAR(13) NOT NULL,
    postal_code VARCHAR(10) NOT NULL, address VARCHAR(500) NOT NULL, address_detail VARCHAR(300) NULL,
    terms_agreed_at DATETIME NOT NULL, privacy_agreed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_parishioner_email (parish_id, email), KEY idx_parishioner_parish_name (parish_id, name),
    CONSTRAINT fk_parishioner_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [parishionerColumns] = await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parishioners'");
  const parishionerColumnNames = new Set(parishionerColumns.map((row) => String(row.COLUMN_NAME)));
  if (!parishionerColumnNames.has("password_hash")) await pool.query("ALTER TABLE parishioners ADD COLUMN password_hash VARCHAR(255) NULL AFTER email");
  if (!parishionerColumnNames.has("push_opt_in")) await pool.query("ALTER TABLE parishioners ADD COLUMN push_opt_in TINYINT(1) NOT NULL DEFAULT 0 AFTER privacy_agreed_at");
  if (!parishionerColumnNames.has("email_opt_in")) await pool.query("ALTER TABLE parishioners ADD COLUMN email_opt_in TINYINT(1) NOT NULL DEFAULT 0 AFTER push_opt_in");
  if (!parishionerColumnNames.has("gender")) await pool.query("ALTER TABLE parishioners ADD COLUMN gender VARCHAR(20) NULL AFTER birth_date");
  await pool.query(`CREATE TABLE IF NOT EXISTS parishioner_schedule_saves (
    parishioner_id BIGINT UNSIGNED NOT NULL, schedule_id BIGINT UNSIGNED NOT NULL,
    saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, reminded_at DATETIME NULL,
    PRIMARY KEY (parishioner_id,schedule_id), KEY idx_schedule_reminder (reminded_at,schedule_id),
    CONSTRAINT fk_schedule_save_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_save_schedule FOREIGN KEY (schedule_id) REFERENCES parish_schedules(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS shrine_pilgrim_visits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shrine_id BIGINT UNSIGNED NOT NULL,
    parishioner_id BIGINT UNSIGNED NOT NULL,
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_shrine_pilgrim_visit (shrine_id, parishioner_id),
    KEY idx_shrine_visit_date (shrine_id, visited_at),
    CONSTRAINT fk_shrine_visit_shrine FOREIGN KEY (shrine_id) REFERENCES catholic_shrines(id) ON DELETE CASCADE,
    CONSTRAINT fk_shrine_visit_parishioner FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS shrine_visit_photos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    review_text TEXT NULL,
    review_group_id VARCHAR(64) NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    tags VARCHAR(1000) NULL,
    image_type VARCHAR(100) NOT NULL,
    image_data LONGBLOB NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_shrine_visit_photo (visit_id, created_at),
    CONSTRAINT fk_shrine_visit_photo_visit FOREIGN KEY (visit_id) REFERENCES shrine_pilgrim_visits(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS shrine_review_reactions (
    review_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL, reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (review_id,parishioner_id),
    CONSTRAINT fk_shrine_review_reaction_review FOREIGN KEY (review_id) REFERENCES shrine_visit_photos(id) ON DELETE CASCADE,
    CONSTRAINT fk_shrine_review_reaction_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS shrine_review_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, review_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(2000) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_shrine_review_comment (review_id,created_at),
    CONSTRAINT fk_shrine_review_comment_review FOREIGN KEY (review_id) REFERENCES shrine_visit_photos(id) ON DELETE CASCADE,
    CONSTRAINT fk_shrine_review_comment_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [shrinePhotoColumns] = await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shrine_visit_photos'");
  if (!shrinePhotoColumns.some((row) => String(row.COLUMN_NAME) === "review_text")) await pool.query("ALTER TABLE shrine_visit_photos ADD COLUMN review_text TEXT NULL AFTER title");
  if (!shrinePhotoColumns.some((row) => String(row.COLUMN_NAME) === "review_group_id")) await pool.query("ALTER TABLE shrine_visit_photos ADD COLUMN review_group_id VARCHAR(64) NULL AFTER review_text");
  if (!shrinePhotoColumns.some((row) => String(row.COLUMN_NAME) === "enabled")) await pool.query("ALTER TABLE shrine_visit_photos ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER review_text");
  await pool.query(`CREATE TABLE IF NOT EXISTS parishioner_registration_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL, name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL,
    code_hash CHAR(64) NOT NULL, token_hash CHAR(64) NULL, expires_at DATETIME NOT NULL, attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    verified_at DATETIME NULL, consumed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_parishioner_registration (parish_id, email, created_at), CONSTRAINT fk_parishioner_registration_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parishioner_login_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL, email VARCHAR(254) NOT NULL,
    code_hash CHAR(64) NOT NULL, expires_at DATETIME NOT NULL, attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    used_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_parishioner_login (parish_id, email, created_at), CONSTRAINT fk_parishioner_login_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    icon_type VARCHAR(100) NULL,
    icon_data MEDIUMBLOB NULL,
    name_ko VARCHAR(200) NOT NULL,
    name_en VARCHAR(300) NULL,
    description TEXT NULL,
    regular_meeting VARCHAR(500) NULL,
    creator_type VARCHAR(20) NOT NULL,
    creator_parishioner_id BIGINT UNSIGNED NULL,
    operator_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested',
    approved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_group_parish_status (parish_id, status, created_at),
    CONSTRAINT fk_group_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_creator FOREIGN KEY (creator_parishioner_id) REFERENCES parishioners(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_group_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT UNSIGNED NOT NULL,
    parishioner_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested',
    joined_at DATETIME NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    application_message VARCHAR(2000) NULL,
    withdrawal_requested_at DATETIME NULL,
    withdrawal_request_reason VARCHAR(2000) NULL,
    withdrawal_reason VARCHAR(1000) NULL,
    rejection_reason VARCHAR(1000) NULL,
    decided_at DATETIME NULL,
    notification_read_at DATETIME NULL,
    UNIQUE KEY uk_group_member (group_id, parishioner_id),
    KEY idx_group_member_parishioner (parishioner_id),
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES parish_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_member_parishioner FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [groupMemberColumns] = await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_group_members'");
  const groupMemberNames = new Set(groupMemberColumns.map(row=>String(row.COLUMN_NAME)));
  if(!groupMemberNames.has("status")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved' AFTER parishioner_id");
  if(!groupMemberNames.has("requested_at")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER joined_at");
  if(!groupMemberNames.has("application_message")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN application_message VARCHAR(2000) NULL AFTER requested_at");
  if(!groupMemberNames.has("withdrawal_requested_at")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN withdrawal_requested_at DATETIME NULL AFTER application_message");
  if(!groupMemberNames.has("withdrawal_request_reason")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN withdrawal_request_reason VARCHAR(2000) NULL AFTER withdrawal_requested_at");
  if(!groupMemberNames.has("withdrawal_reason")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN withdrawal_reason VARCHAR(1000) NULL AFTER withdrawal_requested_at");
  if(!groupMemberNames.has("rejection_reason")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN rejection_reason VARCHAR(1000) NULL AFTER requested_at");
  if(!groupMemberNames.has("decided_at")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN decided_at DATETIME NULL AFTER rejection_reason");
  if(!groupMemberNames.has("notification_read_at")) await pool.query("ALTER TABLE parish_group_members ADD COLUMN notification_read_at DATETIME NULL AFTER decided_at");
  if(groupMemberColumns.find(row=>String(row.COLUMN_NAME)==="joined_at")?.IS_NULLABLE!=="YES") await pool.query("ALTER TABLE parish_group_members MODIFY joined_at DATETIME NULL");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_group_contents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT UNSIGNED NOT NULL,
    author_parishioner_id BIGINT UNSIGNED NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_type VARCHAR(150) NULL,
    attachment_data MEDIUMBLOB NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_group_content (group_id, content_type, created_at),
    CONSTRAINT fk_group_content_group FOREIGN KEY (group_id) REFERENCES parish_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_content_author FOREIGN KEY (author_parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [groupContentColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_group_contents'");
  const groupContentNames=new Set(groupContentColumns.map(row=>String(row.COLUMN_NAME)));
  if(!groupContentNames.has("attachment_name"))await pool.query("ALTER TABLE parish_group_contents ADD COLUMN attachment_name VARCHAR(255) NULL AFTER content");
  if(!groupContentNames.has("attachment_type"))await pool.query("ALTER TABLE parish_group_contents ADD COLUMN attachment_type VARCHAR(150) NULL AFTER attachment_name");
  if(!groupContentNames.has("attachment_data"))await pool.query("ALTER TABLE parish_group_contents ADD COLUMN attachment_data MEDIUMBLOB NULL AFTER attachment_type");
  if(!groupContentNames.has("author_name"))await pool.query("ALTER TABLE parish_group_contents ADD COLUMN author_name VARCHAR(200) NULL AFTER author_parishioner_id");
  if(groupContentColumns.find(row=>String(row.COLUMN_NAME)==="author_parishioner_id")?.IS_NULLABLE!=="YES")await pool.query("ALTER TABLE parish_group_contents MODIFY author_parishioner_id BIGINT UNSIGNED NULL");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_group_content_reactions (
    content_id BIGINT UNSIGNED NOT NULL,
    parishioner_id BIGINT UNSIGNED NOT NULL,
    reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_id, parishioner_id),
    CONSTRAINT fk_group_content_reaction_content FOREIGN KEY (content_id) REFERENCES parish_group_contents(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_content_reaction_member FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_group_content_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    content_id BIGINT UNSIGNED NOT NULL,
    author_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(2000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_group_content_comment (content_id, created_at),
    CONSTRAINT fk_group_content_comment_content FOREIGN KEY (content_id) REFERENCES parish_group_contents(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_content_comment_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parishioner_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    parishioner_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_parishioner_notification (parishioner_id, read_at, created_at),
    CONSTRAINT fk_notification_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_parishioner FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_parish_notification (parish_id, read_at, created_at),
    CONSTRAINT fk_admin_notification_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS catacomb_posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parish_id BIGINT UNSIGNED NOT NULL,
    author_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    tags VARCHAR(1000) NOT NULL DEFAULT '',
    anonymous TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'requested',
    rejection_reason VARCHAR(1000) NULL,
    decided_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_catacomb_post_parish (parish_id, created_at),
    CONSTRAINT fk_catacomb_post_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_catacomb_post_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [catacombPostColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='catacomb_posts'");
  if(!catacombPostColumns.some(row=>String(row.COLUMN_NAME)==="anonymous"))await pool.query("ALTER TABLE catacomb_posts ADD COLUMN anonymous TINYINT(1) NOT NULL DEFAULT 0 AFTER tags");
  if(!catacombPostColumns.some(row=>String(row.COLUMN_NAME)==="status"))await pool.query("ALTER TABLE catacomb_posts ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved' AFTER anonymous");
  if(!catacombPostColumns.some(row=>String(row.COLUMN_NAME)==="rejection_reason"))await pool.query("ALTER TABLE catacomb_posts ADD COLUMN rejection_reason VARCHAR(1000) NULL AFTER status");
  if(!catacombPostColumns.some(row=>String(row.COLUMN_NAME)==="decided_at"))await pool.query("ALTER TABLE catacomb_posts ADD COLUMN decided_at DATETIME NULL AFTER rejection_reason");
  await pool.query(`CREATE TABLE IF NOT EXISTS catacomb_reactions (
    post_id BIGINT UNSIGNED NOT NULL,
    parishioner_id BIGINT UNSIGNED NOT NULL,
    reaction VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, parishioner_id),
    CONSTRAINT fk_catacomb_reaction_post FOREIGN KEY (post_id) REFERENCES catacomb_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_catacomb_reaction_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS catacomb_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED NOT NULL,
    author_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(2000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_catacomb_comment_post (post_id, created_at),
    CONSTRAINT fk_catacomb_comment_post FOREIGN KEY (post_id) REFERENCES catacomb_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_catacomb_comment_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS catacomb_comment_likes (
    comment_id BIGINT UNSIGNED NOT NULL,
    parishioner_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, parishioner_id),
    CONSTRAINT fk_catacomb_like_comment FOREIGN KEY (comment_id) REFERENCES catacomb_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_catacomb_like_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_suggestions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL, content TEXT NOT NULL, tags VARCHAR(1000) NOT NULL DEFAULT '', anonymous TINYINT(1) NOT NULL DEFAULT 0,
    icon_type VARCHAR(100) NULL, icon_data MEDIUMBLOB NULL,
    attachment_name VARCHAR(255) NULL, attachment_type VARCHAR(150) NULL, attachment_data MEDIUMBLOB NULL,
    status ENUM('requested','approved','rejected') NOT NULL DEFAULT 'requested', read_at DATETIME NULL, decision_explanation VARCHAR(4000) NULL,
    action_content VARCHAR(10000) NULL, decided_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_suggestion_parish (parish_id,status,created_at),
    CONSTRAINT fk_suggestion_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_suggestion_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [suggestionColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parish_suggestions'");
  if(!suggestionColumns.some(row=>String(row.COLUMN_NAME)==="read_at"))await pool.query("ALTER TABLE parish_suggestions ADD COLUMN read_at DATETIME NULL AFTER status");
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_suggestion_reactions (
    suggestion_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL, reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (suggestion_id,parishioner_id),
    CONSTRAINT fk_suggestion_reaction_post FOREIGN KEY (suggestion_id) REFERENCES parish_suggestions(id) ON DELETE CASCADE,
    CONSTRAINT fk_suggestion_reaction_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS parish_suggestion_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, suggestion_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(2000) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_suggestion_comment (suggestion_id,created_at),
    CONSTRAINT fk_suggestion_comment_post FOREIGN KEY (suggestion_id) REFERENCES parish_suggestions(id) ON DELETE CASCADE,
    CONSTRAINT fk_suggestion_comment_user FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_missions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NULL,
    author_type VARCHAR(20) NOT NULL DEFAULT 'parishioner', author_name VARCHAR(200) NULL,
    title VARCHAR(200) NOT NULL, content TEXT NOT NULL, tags VARCHAR(1000) NOT NULL DEFAULT '', anonymous TINYINT(1) NOT NULL DEFAULT 0,
    application_from DATE NULL, application_to DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested', rejection_reason VARCHAR(1000) NULL, decided_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_mission_parish_status (parish_id,status,created_at),
    CONSTRAINT fk_mission_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_mission_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [missionColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sharing_missions'");
  const missionColumnNames=new Set(missionColumns.map(row=>String(row.COLUMN_NAME)));
  if(!missionColumnNames.has("author_type"))await pool.query("ALTER TABLE sharing_missions ADD COLUMN author_type VARCHAR(20) NOT NULL DEFAULT 'parishioner' AFTER author_id");
  if(!missionColumnNames.has("author_name"))await pool.query("ALTER TABLE sharing_missions ADD COLUMN author_name VARCHAR(200) NULL AFTER author_type");
  if(!missionColumnNames.has("application_from"))await pool.query("ALTER TABLE sharing_missions ADD COLUMN application_from DATE NULL AFTER anonymous");
  if(!missionColumnNames.has("application_to"))await pool.query("ALTER TABLE sharing_missions ADD COLUMN application_to DATE NULL AFTER application_from");
  if(!missionColumnNames.has("icon_type"))await pool.query("ALTER TABLE sharing_missions ADD COLUMN icon_type VARCHAR(100) NULL AFTER anonymous");
  if(!missionColumnNames.has("icon_data"))await pool.query("ALTER TABLE sharing_missions ADD COLUMN icon_data MEDIUMBLOB NULL AFTER icon_type");
  if(missionColumns.find(row=>String(row.COLUMN_NAME)==="author_id")?.IS_NULLABLE!=="YES")await pool.query("ALTER TABLE sharing_missions MODIFY author_id BIGINT UNSIGNED NULL");
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_mission_edit_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mission_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL, content TEXT NOT NULL, tags VARCHAR(1000) NOT NULL DEFAULT '',
    application_from DATE NOT NULL, application_to DATE NOT NULL, icon_type VARCHAR(100) NULL, icon_data MEDIUMBLOB NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested', rejection_reason VARCHAR(1000) NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_at DATETIME NULL,
    UNIQUE KEY uk_mission_edit_request (mission_id),
    CONSTRAINT fk_mission_edit_request_mission FOREIGN KEY (mission_id) REFERENCES sharing_missions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_mission_applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mission_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL,
    message VARCHAR(2000) NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'requested', decided_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uk_mission_application (mission_id,parishioner_id),
    CONSTRAINT fk_mission_application_mission FOREIGN KEY (mission_id) REFERENCES sharing_missions(id) ON DELETE CASCADE,
    CONSTRAINT fk_mission_application_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [missionApplicationColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sharing_mission_applications'");
  const missionApplicationNames=new Set(missionApplicationColumns.map(row=>String(row.COLUMN_NAME)));
  if(!missionApplicationNames.has("message"))await pool.query("ALTER TABLE sharing_mission_applications ADD COLUMN message VARCHAR(2000) NOT NULL DEFAULT '' AFTER parishioner_id");
  if(!missionApplicationNames.has("status"))await pool.query("ALTER TABLE sharing_mission_applications ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'requested' AFTER message");
  if(!missionApplicationNames.has("decided_at"))await pool.query("ALTER TABLE sharing_mission_applications ADD COLUMN decided_at DATETIME NULL AFTER status");
  if(!missionApplicationNames.has("rejection_reason"))await pool.query("ALTER TABLE sharing_mission_applications ADD COLUMN rejection_reason VARCHAR(1000) NULL AFTER status");
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_mission_activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mission_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    activity_date DATE NOT NULL, time_from TIME NOT NULL, time_to TIME NOT NULL, content VARCHAR(5000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_mission_activity (mission_id,activity_date),
    CONSTRAINT fk_mission_activity_mission FOREIGN KEY (mission_id) REFERENCES sharing_missions(id) ON DELETE CASCADE,
    CONSTRAINT fk_mission_activity_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_mission_reactions (
    mission_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL, reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (mission_id,parishioner_id),
    CONSTRAINT fk_mission_reaction_mission FOREIGN KEY (mission_id) REFERENCES sharing_missions(id) ON DELETE CASCADE,
    CONSTRAINT fk_mission_reaction_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_mission_questions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, mission_id BIGINT UNSIGNED NOT NULL, asker_id BIGINT UNSIGNED NOT NULL,
    question VARCHAR(2000) NOT NULL, anonymous TINYINT(1) NOT NULL DEFAULT 0, answer VARCHAR(5000) NULL, answered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_mission_question (mission_id,created_at),
    CONSTRAINT fk_mission_question_mission FOREIGN KEY (mission_id) REFERENCES sharing_missions(id) ON DELETE CASCADE,
    CONSTRAINT fk_mission_question_asker FOREIGN KEY (asker_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [missionQuestionColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sharing_mission_questions'");
  if(!missionQuestionColumns.some(row=>String(row.COLUMN_NAME)==="anonymous"))await pool.query("ALTER TABLE sharing_mission_questions ADD COLUMN anonymous TINYINT(1) NOT NULL DEFAULT 0 AFTER question");
  await pool.query(`CREATE TABLE IF NOT EXISTS prayer_dreams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL, sender_id BIGINT UNSIGNED NOT NULL, recipient_id BIGINT UNSIGNED NOT NULL,
    prayer_text TEXT NOT NULL, is_public TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, read_at DATETIME NULL,
    KEY idx_prayer_recipient (recipient_id,created_at), KEY idx_prayer_sender (sender_id,created_at),
    CONSTRAINT fk_prayer_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_sender FOREIGN KEY (sender_id) REFERENCES parishioners(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_recipient FOREIGN KEY (recipient_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [prayerDreamColumns]=await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prayer_dreams'");
  if(!prayerDreamColumns.some(row=>String(row.COLUMN_NAME)==="is_public"))await pool.query("ALTER TABLE prayer_dreams ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0 AFTER prayer_text");
  if(!prayerDreamColumns.some(row=>String(row.COLUMN_NAME)==="target_type"))await pool.query("ALTER TABLE prayer_dreams ADD COLUMN target_type VARCHAR(20) NOT NULL DEFAULT 'parishioner' AFTER recipient_id");
  if(!prayerDreamColumns.some(row=>String(row.COLUMN_NAME)==="target_ref_id"))await pool.query("ALTER TABLE prayer_dreams ADD COLUMN target_ref_id BIGINT UNSIGNED NULL AFTER target_type");
  if(!prayerDreamColumns.some(row=>String(row.COLUMN_NAME)==="target_name"))await pool.query("ALTER TABLE prayer_dreams ADD COLUMN target_name VARCHAR(200) NULL AFTER target_ref_id");
  if(!prayerDreamColumns.some(row=>String(row.COLUMN_NAME)==="target_baptismal_name"))await pool.query("ALTER TABLE prayer_dreams ADD COLUMN target_baptismal_name VARCHAR(100) NULL AFTER target_name");
  await pool.query(`CREATE TABLE IF NOT EXISTS prayer_dream_viewers (
    prayer_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (prayer_id,parishioner_id),
    CONSTRAINT fk_prayer_viewer_prayer FOREIGN KEY (prayer_id) REFERENCES prayer_dreams(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_viewer_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS prayer_dream_recipients (
    prayer_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL, read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (prayer_id,parishioner_id),
    CONSTRAINT fk_prayer_extra_recipient_prayer FOREIGN KEY (prayer_id) REFERENCES prayer_dreams(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_extra_recipient_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS prayer_dream_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, prayer_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(2000) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prayer_comment_prayer FOREIGN KEY (prayer_id) REFERENCES prayer_dreams(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_comment_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS prayer_dream_reactions (
    prayer_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL, reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (prayer_id,parishioner_id),
    CONSTRAINT fk_prayer_reaction_prayer FOREIGN KEY (prayer_id) REFERENCES prayer_dreams(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_reaction_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sharing_mission_qa_reactions (
    question_id BIGINT UNSIGNED NOT NULL, parishioner_id BIGINT UNSIGNED NOT NULL, target VARCHAR(10) NOT NULL, reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (question_id,parishioner_id,target),
    CONSTRAINT fk_mission_qa_reaction_question FOREIGN KEY (question_id) REFERENCES sharing_mission_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_mission_qa_reaction_user FOREIGN KEY (parishioner_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS memorials (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parish_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL, baptismal_name VARCHAR(100) NULL, relation_type VARCHAR(20) NULL, relation_detail VARCHAR(100) NULL, history_text TEXT NULL, ordination_text VARCHAR(300) NULL,
    death_date DATE NOT NULL, biography TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'requested', rejection_reason VARCHAR(1000) NULL,
    decided_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_memorial_parish_status (parish_id,status,created_at), CONSTRAINT fk_memorial_parish FOREIGN KEY (parish_id) REFERENCES parishes(id) ON DELETE CASCADE,
    CONSTRAINT fk_memorial_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [memorialColumns] = await pool.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='memorials'");
  const memorialColumnNames = new Set(memorialColumns.map(row => String(row.COLUMN_NAME)));
  if (!memorialColumnNames.has("relation_type")) await pool.query("ALTER TABLE memorials ADD COLUMN relation_type VARCHAR(20) NULL AFTER baptismal_name");
  if (!memorialColumnNames.has("relation_detail")) await pool.query("ALTER TABLE memorials ADD COLUMN relation_detail VARCHAR(100) NULL AFTER relation_type");
  await pool.query(`CREATE TABLE IF NOT EXISTS memorial_photos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, memorial_id BIGINT UNSIGNED NOT NULL, image_type VARCHAR(100) NOT NULL, image_data MEDIUMBLOB NOT NULL,
    display_order INT UNSIGNED NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_memorial_photo (memorial_id,display_order), CONSTRAINT fk_memorial_photo FOREIGN KEY (memorial_id) REFERENCES memorials(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS memorial_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, memorial_id BIGINT UNSIGNED NOT NULL, author_id BIGINT UNSIGNED NOT NULL,
    entry_type VARCHAR(20) NOT NULL, content VARCHAR(3000) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_memorial_entry (memorial_id,created_at), CONSTRAINT fk_memorial_entry_memorial FOREIGN KEY (memorial_id) REFERENCES memorials(id) ON DELETE CASCADE,
    CONSTRAINT fk_memorial_entry_author FOREIGN KEY (author_id) REFERENCES parishioners(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.set("trust proxy", 1);
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(root, "public")));

app.get("/parish", (_req, res) => res.sendFile(path.join(root, "public/parish/index.html")));
app.get("/parish/register", (_req, res) => res.sendFile(path.join(root, "public/parish/register.html")));
app.get("/parishioner", (_req, res) => res.sendFile(path.join(root, "public/parishioner/index.html")));
app.get("/parishioner/register", (_req, res) => res.sendFile(path.join(root, "public/parishioner/register.html")));
app.get("/supervisor", (_req, res) => res.sendFile(path.join(root, "public/supervisor/index.html")));

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key]) => key).map(([key, value]) => [key, decodeURIComponent(value ?? "")]));
}

function supervisorSignature(payload: string) {
  return crypto.createHmac("sha256", process.env.SUPERVISOR_SESSION_SECRET ?? "").update(payload).digest("base64url");
}

function createSupervisorSession(username: string) {
  const payload = Buffer.from(JSON.stringify({ username, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${supervisorSignature(payload)}`;
}

function getSupervisor(req: express.Request) {
  const token = parseCookies(req.headers.cookie).supervisor_session;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = supervisorSignature(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as { username: string; expires: number };
    return session.expires > Date.now() ? session.username : null;
  } catch { return null; }
}

function requireSupervisorLegacy(req: express.Request, res: express.Response, next: express.NextFunction) {
  const username = getSupervisor(req);
  if (!username) return res.status(401).json({ message: "로그인이 필요합니다." });
  res.locals.supervisor = username;
  next();
}

app.post("/api/_legacy/supervisor/login", (req, res) => {
  const username = String(req.body.username ?? "");
  const password = String(req.body.password ?? "");
  const validUser = username === process.env.SUPERVISOR_USERNAME;
  const expectedPassword = process.env.SUPERVISOR_PASSWORD ?? "";
  const validPassword = password.length === expectedPassword.length && password.length > 0
    && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword));
  if (!validUser || !validPassword) return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
  const secure = process.env.APP_URL?.startsWith("https://") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `supervisor_session=${encodeURIComponent(createSupervisorSession(username))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`);
  res.json({ message: "로그인되었습니다.", username });
});

app.post("/api/_legacy/supervisor/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "supervisor_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ message: "로그아웃되었습니다." });
});

app.get("/api/_legacy/supervisor/me", requireSupervisorLegacy, (_req, res) => res.json({ username: res.locals.supervisor }));

const sessionMinutes = 10;
function tokenHash(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }
function sessionCookie(name: string, token: string, maxAge = 600) {
  const secure = process.env.APP_URL?.startsWith("https://") ? "; Secure" : "";
  return `${name}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}
function clientIp(req: express.Request) { return String(req.ip || req.socket.remoteAddress || "unknown").slice(0, 45); }

async function closeExpiredSessions(userType?: string, userKey?: string) {
  const filters = userType && userKey ? " AND user_type = ? AND user_key = ?" : "";
  await pool.execute(
    `UPDATE login_sessions SET logged_out_at = expires_at, logout_reason = 'timeout'
     WHERE logged_out_at IS NULL AND expires_at <= NOW()${filters}`,
    userType && userKey ? [userType, userKey] : [],
  );
}

async function openSession(req: express.Request, userType: string, userKey: string, parishId: number | null) {
  await closeExpiredSessions(userType, userKey);
  const [previous] = await pool.query<RowDataPacket[]>(
    `SELECT logged_out_at, ip_address, logout_reason FROM login_sessions
     WHERE user_type = ? AND user_key = ? AND logged_out_at IS NOT NULL
     ORDER BY logged_out_at DESC LIMIT 1`, [userType, userKey],
  );
  const token = crypto.randomBytes(32).toString("base64url");
  await pool.execute(
    `INSERT INTO login_sessions (user_type, user_key, parish_id, token_hash, expires_at, ip_address)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${sessionMinutes} MINUTE), ?)`,
    [userType, userKey, parishId, tokenHash(token), clientIp(req)],
  );
  return { token, previous: previous[0] ?? null };
}

async function requireSupervisor(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const token = parseCookies(req.headers.cookie).supervisor_session;
    if (!token) return res.status(401).json({ message: "로그인이 필요합니다." });
    const hash = tokenHash(token);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_key FROM login_sessions WHERE token_hash = ? AND user_type = 'supervisor'
       AND logged_out_at IS NULL AND expires_at > NOW() LIMIT 1`, [hash],
    );
    if (!rows.length) return res.status(401).json({ message: "세션이 만료되었습니다. 다시 로그인해 주세요." });
    await pool.execute("UPDATE login_sessions SET last_seen_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?", [rows[0]!.id]);
    res.setHeader("Set-Cookie", sessionCookie("supervisor_session", token));
    res.locals.supervisor = rows[0]!.user_key;
    res.locals.sessionId = rows[0]!.id;
    next();
  } catch (error) { next(error); }
}

app.post("/api/supervisor/login", async (req, res, next) => {
  try {
    const username = String(req.body.username ?? "");
    const password = String(req.body.password ?? "");
    const expected = process.env.SUPERVISOR_PASSWORD ?? "";
    const valid = username === process.env.SUPERVISOR_USERNAME && password.length === expected.length && password.length > 0
      && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
    if (!valid) return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    const session = await openSession(req, "supervisor", username, null);
    res.setHeader("Set-Cookie", sessionCookie("supervisor_session", session.token));
    res.json({ message: "로그인되었습니다.", username, previousSession: session.previous });
  } catch (error) { next(error); }
});

app.post("/api/supervisor/logout", requireSupervisor, async (_req, res, next) => {
  try {
    await pool.execute("UPDATE login_sessions SET logged_out_at = NOW(), logout_reason = 'manual' WHERE id = ? AND logged_out_at IS NULL", [res.locals.sessionId]);
    res.setHeader("Set-Cookie", sessionCookie("supervisor_session", "", 0));
    res.json({ message: "로그아웃되었습니다." });
  } catch (error) { next(error); }
});

app.get("/api/supervisor/me", requireSupervisor, (_req, res) => res.json({ username: res.locals.supervisor }));

app.get("/api/supervisor/parishes", requireSupervisor, async (_req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, GROUP_CONCAT(CONCAT(COALESCE(pa.name, '이름 미등록'), ' <', pa.email, '>') ORDER BY pa.id SEPARATOR ', ') AS administrator_emails,
       GROUP_CONCAT(COALESCE(pa.name, '이름 미등록') ORDER BY pa.id SEPARATOR ', ') AS administrator_names
       FROM parishes p LEFT JOIN parish_admins pa ON pa.parish_id = p.id
       GROUP BY p.id ORDER BY COALESCE(p.approval_requested_at, p.created_at) DESC, p.id DESC`,
    );
    res.json(rows);
  } catch (error) { next(error); }
});

app.patch("/api/supervisor/parishes/:id/approval", requireSupervisor, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status ?? "");
    const reason = String(req.body.cancellationReason ?? "").trim();
    if (!Number.isSafeInteger(id) || !["pending", "approved", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "올바른 승인 상태를 선택해 주세요." });
    }
    if (status === "cancelled" && (!reason || reason.length > 1000)) {
      return res.status(400).json({ message: "취소 사유를 1~1000자로 입력해 주세요." });
    }
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `UPDATE parishes SET approval_status = ?, cancellation_reason = ?, modified_by = ?, modified_at = NOW() WHERE id = ?`,
      [status, status === "cancelled" ? reason : null, res.locals.supervisor, id],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
    res.json({ message: "승인 상태가 저장되었습니다." });
  } catch (error) { next(error); }
});

app.get("/api/parishes", async (req, res, next) => {
  try {
    const query = String(req.query.q ?? "").trim();
    if (query.length < 2) return res.json([]);
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, diocese FROM parishes
       WHERE name LIKE ? ESCAPE '\\\\' ORDER BY name LIMIT 10`,
      [`%${escaped}%`],
    );
    res.json(rows);
  } catch (error) { next(error); }
});

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function verificationEmailHtml(code: string, purpose: string) {
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paxlink 인증코드</title></head>
<body style="margin:0;padding:0;background:#f3f6fa;font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;color:#1e2d43;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fa;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e0e7f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(21,52,95,.08);">
        <tr><td style="height:6px;background:#1769e0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:34px 38px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td width="42" height="42" align="center" style="width:42px;height:42px;border-radius:12px;background:#1769e0;color:#ffffff;font-size:21px;font-weight:800;">P</td>
            <td style="padding-left:12px;color:#15345f;font-size:20px;font-weight:800;letter-spacing:-.4px;">Paxlink</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:30px 38px 10px;">
          <div style="color:#1769e0;font-size:11px;font-weight:800;letter-spacing:1.5px;">EMAIL VERIFICATION</div>
          <h1 style="margin:10px 0 12px;color:#172b49;font-size:25px;line-height:1.35;letter-spacing:-1px;">이메일 인증을 완료해 주세요</h1>
          <p style="margin:0;color:#66758b;font-size:14px;line-height:1.75;">${purpose}을 위한 인증코드입니다.<br>아래 코드를 인증 화면에 입력해 주세요.</p>
        </td></tr>
        <tr><td style="padding:18px 38px;">
          <div style="padding:24px 16px;border:1px solid #c9dcf7;border-radius:14px;background:#f4f8ff;text-align:center;">
            <div style="margin-bottom:9px;color:#6d7f98;font-size:11px;font-weight:700;letter-spacing:.8px;">인증코드</div>
            <div style="color:#1769e0;font-family:Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:9px;line-height:1.2;">${code}</div>
          </div>
        </td></tr>
        <tr><td style="padding:4px 38px 34px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:10px;background:#fff8e8;"><tr>
            <td width="38" valign="top" style="padding:14px 0 14px 15px;color:#b57900;font-size:16px;">●</td>
            <td style="padding:13px 15px 13px 0;color:#74591c;font-size:12px;line-height:1.65;"><strong>3분 이내 입력해 주세요.</strong><br>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 38px;border-top:1px solid #e8edf4;background:#f9fbfd;color:#8a96a8;font-size:11px;line-height:1.65;text-align:center;">
          이 메일은 Paxlink 인증 요청에 의해 자동 발송되었습니다.<br>보안을 위해 인증코드를 다른 사람에게 알려주지 마세요.
        </td></tr>
      </table>
      <p style="margin:18px 0 0;color:#9aa5b4;font-size:11px;">© 2026 Paxlink</p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendCode(email: string, code: string, purpose: string) {
  if (process.env.EMAIL_DELIVERY_MODE === "mock") return code;
  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM_NAME
        ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`
        : process.env.SMTP_FROM,
      to: email,
      subject: `[Paxlink] ${purpose} 인증코드`,
      text: `인증코드는 ${code}입니다. 3분 이내 입력해 주세요.`,
      html: verificationEmailHtml(code, purpose),
    });
    return undefined;
  }
  if (process.env.NODE_ENV !== "production") return code;
  throw new Error("SMTP_NOT_CONFIGURED");
}

app.post("/api/parish-registration/code", async (req, res, next) => {
  try {
    const managerName = String(req.body.managerName ?? "").trim();
    const email = normalizeEmail(req.body.email);
    if (managerName.length < 2 || managerName.length > 100) return res.status(400).json({ message: "담당자 이름을 2~100자로 입력해 주세요." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "올바른 담당자 이메일을 입력해 주세요." });
    const code = crypto.randomInt(100000, 1000000).toString();
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    await pool.execute(
      "INSERT INTO parish_registration_codes (manager_name, email, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE))",
      [managerName, email, hash],
    );
    const devCode = await sendCode(email, code, "성당 등록 담당자");
    res.json({ message: devCode ? "가상 인증번호를 발급했습니다." : "담당자 이메일로 인증코드를 발송했습니다.", devCode });
  } catch (error) {
    if ((error as Error).message === "SMTP_NOT_CONFIGURED") return res.status(503).json({ message: "이메일 발송 설정이 필요합니다." });
    next(error);
  }
});

app.post("/api/parish-registration/verify", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code ?? "").trim();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code_hash, expires_at, attempts FROM parish_registration_codes
       WHERE email = ? AND verified_at IS NULL AND consumed_at IS NULL
       AND expires_at > NOW() AND attempts < 5 ORDER BY id DESC LIMIT 1`, [email],
    );
    const record = rows[0];
    if (!record) {
      return res.status(400).json({ message: "인증코드가 만료되었습니다. 다시 요청해 주세요." });
    }
    const actual = crypto.createHash("sha256").update(code).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(record.code_hash), Buffer.from(actual))) {
      await pool.execute("UPDATE parish_registration_codes SET attempts = attempts + 1 WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "인증코드가 올바르지 않습니다." });
    }
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.execute("UPDATE parish_registration_codes SET verified_at = NOW(), token_hash = ? WHERE id = ?", [tokenHash, record.id]);
    res.json({ message: "이메일 인증이 완료되었습니다.", token });
  } catch (error) { next(error); }
});

const phonePattern = /^(?:02-\d{4}-\d{4}|\d{3}-\d{3,4}-\d{4})$/;
const mobilePattern = /^010-\d{4}-\d{4}$/;
const parishCodePattern = /^[A-Za-z0-9_-]{2,40}$/;

app.post("/api/parishes", async (req, res, next) => {
  const values = {
    email: normalizeEmail(req.body.email), token: String(req.body.token ?? ""),
    name: String(req.body.name ?? "").trim(), parishCode: String(req.body.parishCode ?? "").trim(),
    phone: String(req.body.phone ?? "").trim(), postalCode: String(req.body.postalCode ?? "").trim(),
    address: String(req.body.address ?? "").trim(), addressDetail: String(req.body.addressDetail ?? "").trim(),
    diocese: String(req.body.diocese ?? "").trim(), district: String(req.body.district ?? "").trim(),
    jurisdiction: String(req.body.jurisdiction ?? "").trim(), officePhone: String(req.body.officePhone ?? "").trim(),
    fax: String(req.body.fax ?? "").trim(), homepage: String(req.body.homepage ?? "").trim(),
  };
  const errors: Record<string, string> = {};
  if (values.name.length < 2 || values.name.length > 120) errors.name = "성당 이름은 2~120자로 입력해 주세요.";
  if (!parishCodePattern.test(values.parishCode)) errors.parishCode = "성당 ID는 영문, 숫자, _, -를 사용해 2~40자로 입력해 주세요.";
  if (!phonePattern.test(values.phone)) errors.phone = "전화번호 형식은 02-0000-0000, 000-000-0000 또는 000-0000-0000이어야 합니다.";
  if (!/^\d{5}$/.test(values.postalCode)) errors.postalCode = "주소 검색으로 5자리 우편번호를 선택해 주세요.";
  if (!values.address) errors.address = "주소 검색으로 기본 주소를 선택해 주세요.";
  if (!values.addressDetail) errors.addressDetail = "상세주소를 입력해 주세요.";
  if (!values.diocese) errors.diocese = "교구를 입력해 주세요.";
  if (!values.district) errors.district = "지구를 입력해 주세요.";
  if (!values.jurisdiction) errors.jurisdiction = "관할을 입력해 주세요.";
  if (!phonePattern.test(values.officePhone)) errors.officePhone = "전화번호 형식은 02-0000-0000, 000-000-0000 또는 000-0000-0000이어야 합니다.";
  if (values.fax && !phonePattern.test(values.fax)) errors.fax = "팩스 형식은 02-0000-0000, 000-000-0000 또는 000-0000-0000이어야 합니다.";
  if (values.homepage) { try { const url = new URL(values.homepage); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { errors.homepage = "http:// 또는 https://로 시작하는 URL을 입력해 주세요."; } }
  if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors });
  const tokenHash = crypto.createHash("sha256").update(values.token).digest("hex");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [codes] = await connection.query<RowDataPacket[]>(
      `SELECT id, manager_name FROM parish_registration_codes WHERE email = ? AND token_hash = ?
       AND verified_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) AND consumed_at IS NULL FOR UPDATE`,
      [values.email, tokenHash],
    );
    if (!codes.length) { await connection.rollback(); return res.status(401).json({ message: "이메일 인증이 만료되었습니다. 다시 인증해 주세요." }); }
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO parishes (name, parish_code, phone, postal_code, address, address_detail, diocese, district, jurisdiction, office_phone, fax, homepage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [values.name, values.parishCode, values.phone, values.postalCode, values.address, values.addressDetail, values.diocese, values.district, values.jurisdiction, values.officePhone, values.fax || null, values.homepage || null],
    );
    await connection.execute("INSERT INTO parish_admins (parish_id, name, email) VALUES (?, ?, ?)", [result.insertId, codes[0]!.manager_name, values.email]);
    await connection.execute("UPDATE parish_registration_codes SET consumed_at = NOW() WHERE id = ?", [codes[0]!.id]);
    await connection.commit();
    res.status(201).json({ message: "성당 등록이 완료되었습니다.", parishId: result.insertId });
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return res.status(409).json({ message: "이미 등록된 성당 이름 또는 성당 ID입니다." });
    next(error);
  } finally { connection.release(); }
});

app.post("/api/parishioner-registration/code", async (req, res, next) => { try { const parishId=Number(req.body.parishId),name=String(req.body.name??"").trim(),email=normalizeEmail(req.body.email); if(!Number.isSafeInteger(parishId)||name.length<2||name.length>100||!/\S+@\S+\.\S+/.test(email))return res.status(400).json({message:"성당, 이름, 이메일을 확인해 주세요."}); if(req.body.termsAgreed!==true||req.body.privacyAgreed!==true)return res.status(400).json({message:"이용약관과 개인정보 수집·이용에 동의해 주세요."}); const [parishes]=await pool.query<RowDataPacket[]>("SELECT id FROM parishes WHERE id=? AND approval_status='approved' LIMIT 1",[parishId]); if(!parishes.length)return res.status(400).json({message:"가입 가능한 성당을 선택해 주세요."}); const [existing]=await pool.query<RowDataPacket[]>("SELECT id FROM parishioners WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]); if(existing.length)return res.status(409).json({message:"이미 가입된 이메일입니다."}); const code=crypto.randomInt(100000,1000000).toString(); await pool.execute("INSERT INTO parishioner_registration_codes (parish_id,name,email,code_hash,expires_at) VALUES (?,?,?,?,DATE_ADD(NOW(),INTERVAL 3 MINUTE))",[parishId,name,email,tokenHash(code)]); const devCode=await sendCode(email,code,"신도 회원가입"); res.json({message:devCode?"가상 인증번호를 발급했습니다. 3분 이내 입력해 주세요":"인증코드를 이메일로 발송했습니다. 3분 이내 입력해 주세요",devCode}); }catch(error){const mailError=error as Error&{code?:string};if(mailError.message==="SMTP_NOT_CONFIGURED")return res.status(503).json({message:"이메일 발송 설정이 필요합니다."});if(["ETIMEDOUT","ESOCKET","ECONNECTION"].includes(mailError.code??""))return res.status(504).json({message:"메일 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요."});next(error)} });
app.post("/api/parishioner-registration/verify",async(req,res,next)=>{try{const parishId=Number(req.body.parishId),email=normalizeEmail(req.body.email),code=String(req.body.code??"");const [rows]=await pool.query<RowDataPacket[]>("SELECT id,code_hash FROM parishioner_registration_codes WHERE parish_id=? AND email=? AND verified_at IS NULL AND consumed_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY id DESC LIMIT 1",[parishId,email]);const row=rows[0];if(!row)return res.status(400).json({message:"인증코드가 만료되었습니다."});if(!crypto.timingSafeEqual(Buffer.from(row.code_hash),Buffer.from(tokenHash(code)))){await pool.execute("UPDATE parishioner_registration_codes SET attempts=attempts+1 WHERE id=?",[row.id]);return res.status(400).json({message:"인증코드가 올바르지 않습니다."})}const token=crypto.randomBytes(32).toString("base64url");await pool.execute("UPDATE parishioner_registration_codes SET verified_at=NOW(),token_hash=? WHERE id=?",[tokenHash(token),row.id]);res.json({message:"이메일 인증이 완료되었습니다.",token})}catch(error){next(error)}});
app.post("/api/parishioners",async(req,res,next)=>{const parishId=Number(req.body.parishId),email=normalizeEmail(req.body.email),name=String(req.body.name??"").trim(),token=String(req.body.token??"");const values={baptismalName:String(req.body.baptismalName??"").trim(),birthDate:String(req.body.birthDate??""),phone:String(req.body.phone??"").trim(),mobile:String(req.body.mobile??"").trim(),postalCode:String(req.body.postalCode??"").trim(),address:String(req.body.address??"").trim(),addressDetail:String(req.body.addressDetail??"").trim()};const errors:Record<string,string>={};if(!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate))errors.birthDate="생년월일을 입력해 주세요.";if(!phonePattern.test(values.phone))errors.phone="올바른 전화번호를 입력해 주세요.";if(!mobilePattern.test(values.mobile))errors.mobile="모바일폰번호는 010으로 시작해야 합니다.";if(!/^\d{5}$/.test(values.postalCode))errors.postalCode="주소 검색으로 우편번호를 선택해 주세요.";if(!values.address)errors.address="주소를 선택해 주세요.";if(req.body.termsAgreed!==true||req.body.privacyAgreed!==true)errors.agreement="약관 동의가 필요합니다.";if(Object.keys(errors).length)return res.status(400).json({message:"입력 내용을 확인해 주세요.",errors});const connection=await pool.getConnection();try{await connection.beginTransaction();const [codes]=await connection.query<RowDataPacket[]>("SELECT id,name FROM parishioner_registration_codes WHERE parish_id=? AND email=? AND token_hash=? AND verified_at>=DATE_SUB(NOW(),INTERVAL 30 MINUTE) AND consumed_at IS NULL FOR UPDATE",[parishId,email,tokenHash(token)]);if(!codes.length){await connection.rollback();return res.status(401).json({message:"이메일 인증이 만료되었습니다."})}if(String(codes[0]!.name)!==name){await connection.rollback();return res.status(400).json({message:"인증한 이름과 가입자 이름이 다릅니다."})}await connection.execute("INSERT INTO parishioners (parish_id,name,baptismal_name,email,birth_date,phone,mobile,postal_code,address,address_detail,terms_agreed_at,privacy_agreed_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())",[parishId,name,values.baptismalName||null,email,values.birthDate,values.phone,values.mobile,values.postalCode,values.address,values.addressDetail||null]);await connection.execute("UPDATE parishioner_registration_codes SET consumed_at=NOW() WHERE id=?",[codes[0]!.id]);await connection.commit();res.status(201).json({message:"신도 회원가입이 완료되었습니다."})}catch(error){await connection.rollback();if((error as{code?:string}).code==="ER_DUP_ENTRY")return res.status(409).json({message:"이미 가입된 이메일입니다."});next(error)}finally{connection.release()}});
app.post("/api/parishioner-auth/code",async(req,res,next)=>{try{const parishId=Number(req.body.parishId),email=normalizeEmail(req.body.email);const [users]=await pool.query<RowDataPacket[]>("SELECT id FROM parishioners WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]);if(!users.length)return res.status(403).json({message:"선택한 성당의 가입 정보를 확인해 주세요."});const code=crypto.randomInt(100000,1000000).toString();await pool.execute("INSERT INTO parishioner_login_codes (parish_id,email,code_hash,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 3 MINUTE))",[parishId,email,tokenHash(code)]);const devCode=await sendCode(email,code,"신도 로그인");res.json({message:devCode?"가상 인증번호를 발급했습니다. 3분 이내 입력해 주세요":"인증코드를 발송했습니다. 3분 이내 입력해 주세요",devCode})}catch(error){const mailError=error as Error&{code?:string};if(mailError.message==="SMTP_NOT_CONFIGURED")return res.status(503).json({message:"이메일 발송 설정이 필요합니다."});if(["ETIMEDOUT","ESOCKET","ECONNECTION"].includes(mailError.code??""))return res.status(504).json({message:"메일 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요."});next(error)}});
app.post("/api/parishioner-auth/verify",async(req,res,next)=>{try{const parishId=Number(req.body.parishId),email=normalizeEmail(req.body.email),code=String(req.body.code??"");const [rows]=await pool.query<RowDataPacket[]>("SELECT id,code_hash FROM parishioner_login_codes WHERE parish_id=? AND email=? AND used_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY id DESC LIMIT 1",[parishId,email]);const row=rows[0];if(!row)return res.status(400).json({message:"인증코드가 만료되었습니다."});if(!crypto.timingSafeEqual(Buffer.from(row.code_hash),Buffer.from(tokenHash(code)))){await pool.execute("UPDATE parishioner_login_codes SET attempts=attempts+1 WHERE id=?",[row.id]);return res.status(400).json({message:"인증코드가 올바르지 않습니다."})}await pool.execute("UPDATE parishioner_login_codes SET used_at=NOW() WHERE id=?",[row.id]);const session=await openSession(req,"parishioner",`${parishId}:${email}`,parishId);const [users]=await pool.query<RowDataPacket[]>("SELECT p.name,p.baptismal_name,p.email,h.name AS parish_name FROM parishioners p JOIN parishes h ON h.id=p.parish_id WHERE p.parish_id=? AND p.email=? LIMIT 1",[parishId,email]);res.setHeader("Set-Cookie",sessionCookie("parishioner_session",session.token));res.json({message:"로그인되었습니다.",user:users[0],previous:session.previous})}catch(error){next(error)}});
async function requireParishioner(req:express.Request,res:express.Response,next:express.NextFunction){try{const token=parseCookies(req.headers.cookie).parishioner_session;if(!token)return res.status(401).json({message:"로그인이 필요합니다."});const [rows]=await pool.query<RowDataPacket[]>(`SELECT s.id,s.user_key,s.parish_id,p.name,p.baptismal_name,p.email,h.name AS parish_name FROM login_sessions s JOIN parishioners p ON p.parish_id=s.parish_id AND CONCAT(p.parish_id,':',p.email)=s.user_key JOIN parishes h ON h.id=p.parish_id WHERE s.token_hash=? AND s.user_type='parishioner' AND s.logged_out_at IS NULL AND s.expires_at>NOW() LIMIT 1`,[tokenHash(token)]);if(!rows.length){res.setHeader("Set-Cookie",sessionCookie("parishioner_session","",0));return res.status(401).json({message:"세션이 만료되었습니다. 다시 로그인해 주세요."})}await pool.execute("UPDATE login_sessions SET last_seen_at=NOW(),expires_at=DATE_ADD(NOW(),INTERVAL 10 MINUTE) WHERE id=?",[rows[0]!.id]);res.setHeader("Set-Cookie",sessionCookie("parishioner_session",token));res.locals.parishioner=rows[0];next()}catch(error){next(error)}}
app.get("/api/parishioner-auth/me",requireParishioner,(_req,res)=>{const user=res.locals.parishioner;res.json({id:user.user_key,name:user.name,baptismalName:user.baptismal_name,email:user.email,parishName:user.parish_name})});
app.get("/api/parishioner/parish-information",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id);const [[parishRows],[historyRows],[priestRows]]=await Promise.all([pool.query<RowDataPacket[]>("SELECT name,diocese,district,jurisdiction,postal_code AS postalCode,address,address_detail AS addressDetail,phone,office_phone AS officePhone,fax,homepage FROM parishes WHERE id=? LIMIT 1",[parishId]),pool.query<RowDataPacket[]>("SELECT event_year AS year,event_month AS month,title,description FROM parish_history WHERE parish_id=? AND enabled=1 ORDER BY event_year DESC,event_month DESC,id DESC",[parishId]),pool.query<RowDataPacket[]>("SELECT name,baptismal_name AS baptismalName,role,DATE_FORMAT(appointment_date,'%Y-%m-%d') AS appointmentDate,affiliation,generation FROM parish_priests WHERE parish_id=? AND status='incoming' ORDER BY FIELD(role,'주임','보좌','협력'),incoming_date,id",[parishId])]);if(!parishRows.length)return res.status(404).json({message:"성당 정보를 찾을 수 없습니다."});res.json({basic:parishRows[0],history:historyRows,priests:priestRows})}catch(error){next(error)}});
app.get("/api/parishioner/profile",requireParishioner,async(_req,res,next)=>{try{const id=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT name,baptismal_name AS baptismalName,email,DATE_FORMAT(birth_date,'%Y-%m-%d') AS birthDate,phone,mobile,postal_code AS postalCode,address,address_detail AS addressDetail,(password_hash IS NOT NULL) AS hasPassword,push_opt_in AS pushOptIn,email_opt_in AS emailOptIn,DATE_FORMAT(terms_agreed_at,'%Y-%m-%d %H:%i') AS termsAgreedAt,DATE_FORMAT(privacy_agreed_at,'%Y-%m-%d %H:%i') AS privacyAgreedAt FROM parishioners WHERE id=? LIMIT 1",[id]);if(!rows.length)return res.status(404).json({message:"회원 정보를 찾을 수 없습니다."});res.json(rows[0])}catch(error){next(error)}});
app.patch("/api/parishioner/profile",requireParishioner,async(req,res,next)=>{try{const id=await currentParishionerId(res),name=String(req.body.name??"").trim(),baptismalName=String(req.body.baptismalName??"").trim(),birthDate=String(req.body.birthDate??""),phone=String(req.body.phone??"").trim(),mobile=String(req.body.mobile??"").trim(),postalCode=String(req.body.postalCode??"").trim(),address=String(req.body.address??"").trim(),addressDetail=String(req.body.addressDetail??"").trim(),password=String(req.body.password??"");if(name.length<2||name.length>100)return res.status(400).json({message:"이름을 2~100자로 입력해 주세요."});if(baptismalName.length>100||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(birthDate)||!phonePattern.test(phone)||!mobilePattern.test(mobile)||!/^[0-9]{5}$/.test(postalCode)||!address)return res.status(400).json({message:"개인정보 입력 내용을 확인해 주세요."});if(password&&password.length<8)return res.status(400).json({message:"새 비밀번호는 8자 이상 입력해 주세요."});let passwordHash:string|null=null;if(password){const salt=crypto.randomBytes(16).toString("hex");passwordHash=`scrypt:${salt}:${crypto.scryptSync(password,salt,64).toString("hex")}`}await pool.execute("UPDATE parishioners SET name=?,baptismal_name=?,birth_date=?,phone=?,mobile=?,postal_code=?,address=?,address_detail=?,push_opt_in=?,email_opt_in=?,password_hash=COALESCE(?,password_hash) WHERE id=?",[name,baptismalName||null,birthDate,phone,mobile,postalCode,address,addressDetail||null,req.body.pushOptIn===true?1:0,req.body.emailOptIn===true?1:0,passwordHash,id]);res.json({message:"개인정보가 저장되었습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/profile/gender",requireParishioner,async(_req,res,next)=>{try{const id=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT gender FROM parishioners WHERE id=? LIMIT 1",[id]);res.json({gender:rows[0]?.gender??""})}catch(error){next(error)}});
app.patch("/api/parishioner/profile/gender",requireParishioner,async(req,res,next)=>{try{const id=await currentParishionerId(res),gender=String(req.body.gender??"");if(!["","male","female","other"].includes(gender))return res.status(400).json({message:"성별을 확인해 주세요."});await pool.execute("UPDATE parishioners SET gender=? WHERE id=?",[gender||null,id]);res.json({message:"성별이 저장되었습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/profile/password",requireParishioner,async(req,res,next)=>{try{const id=await currentParishionerId(res),currentPassword=String(req.body.currentPassword??""),newPassword=String(req.body.newPassword??""),confirmPassword=String(req.body.confirmPassword??"");if(newPassword.length<8)return res.status(400).json({message:"새 비밀번호는 8자 이상 입력해 주세요."});if(newPassword!==confirmPassword)return res.status(400).json({message:"새 비밀번호와 확인 값이 일치하지 않습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT password_hash FROM parishioners WHERE id=? LIMIT 1",[id]),stored=String(rows[0]?.password_hash??"");if(stored){const [,salt,expected]=stored.split(":"),actual=salt?crypto.scryptSync(currentPassword,salt,64).toString("hex"):"";if(!expected||actual.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return res.status(400).json({message:"현재 비밀번호가 올바르지 않습니다."})}const salt=crypto.randomBytes(16).toString("hex"),passwordHash=`scrypt:${salt}:${crypto.scryptSync(newPassword,salt,64).toString("hex")}`;await pool.execute("UPDATE parishioners SET password_hash=? WHERE id=?",[passwordHash,id]);res.json({message:"비밀번호가 변경되었습니다."})}catch(error){next(error)}});
app.post("/api/parishioners/preferences",async(req,res,next)=>{try{const parishId=Number(req.body.parishId),email=normalizeEmail(req.body.email),token=String(req.body.token??""),gender=String(req.body.gender??"");if(!["","male","female","other"].includes(gender))return res.status(400).json({message:"성별을 확인해 주세요."});const [codes]=await pool.query<RowDataPacket[]>("SELECT id FROM parishioner_registration_codes WHERE parish_id=? AND email=? AND token_hash=? AND verified_at>=DATE_SUB(NOW(),INTERVAL 30 MINUTE) LIMIT 1",[parishId,email,tokenHash(token)]);if(!codes.length)return res.status(401).json({message:"가입 인증이 만료되었습니다."});await pool.execute("UPDATE parishioners SET push_opt_in=?,email_opt_in=?,gender=? WHERE parish_id=? AND email=?",[req.body.pushOptIn===true?1:0,req.body.emailOptIn===true?1:0,gender||null,parishId,email]);res.json({message:"회원 설정이 저장되었습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/videos", requireParishioner, async (_req, res, next) => {
  try {
    const parishId = Number(res.locals.parishioner.parish_id);
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, youtube_url AS youtubeUrl, video_id AS videoId, title, author_name AS authorName, thumbnail_url AS thumbnailUrl, tags, created_at AS createdAt FROM parish_videos WHERE parish_id = ? ORDER BY created_at DESC, id DESC",
      [parishId],
    );
    res.json(rows.map((row) => ({ ...row, id: Number(row.id),tags:String(row.tags??"").split(",").filter(Boolean) })));
  } catch (error) { next(error); }
});
app.get("/api/parishioner/schedules",requireParishioner,async(req,res,next)=>{
  try{
    const parishId=Number(res.locals.parishioner.parish_id);
    const userId=await currentParishionerId(res);
    const month=String(req.query.month??"");
    if(!/^\d{4}-\d{2}$/.test(month))return res.status(400).json({message:"조회할 월을 확인해 주세요."});
    const reminderConnection=await pool.getConnection();
    try{
      await reminderConnection.beginTransaction();
      const [due]=await reminderConnection.query<RowDataPacket[]>("SELECT s.id,s.title,TIME_FORMAT(s.start_time,'%H:%i') AS startTime,s.location FROM parishioner_schedule_saves x JOIN parish_schedules s ON s.id=x.schedule_id WHERE x.parishioner_id=? AND x.reminded_at IS NULL AND s.schedule_date=DATE_ADD(CURDATE(),INTERVAL 1 DAY) FOR UPDATE",[userId]);
      for(const item of due){const detail=[item.startTime?`${item.startTime} 시작`:"시간 미정",item.location?`장소: ${item.location}`:""].filter(Boolean).join(" · ");await reminderConnection.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,'schedule_reminder','내일 일정 알림',?,'schedule',?)",[parishId,userId,`내일 '${item.title}' 일정이 있습니다. ${detail}`,item.id]);await reminderConnection.execute("UPDATE parishioner_schedule_saves SET reminded_at=NOW() WHERE parishioner_id=? AND schedule_id=?",[userId,item.id])}
      await reminderConnection.commit();
    }catch(error){await reminderConnection.rollback();throw error}finally{reminderConnection.release()}
    const [rows]=await pool.query<RowDataPacket[]>("SELECT id,DATE_FORMAT(schedule_date,'%Y-%m-%d') AS scheduleDate,TIME_FORMAT(start_time,'%H:%i') AS startTime,TIME_FORMAT(end_time,'%H:%i') AS endTime,category,schedule_type AS scheduleType,title,location,content,attachment_name AS attachmentName FROM parish_schedules WHERE parish_id=? AND schedule_date>=CONCAT(?,'-01') AND schedule_date<DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH) ORDER BY schedule_date,start_time,id",[parishId,month,month]);
    res.json(rows.map(row=>({...row,id:Number(row.id)})));
  }catch(error){next(error)}
});
app.post("/api/parishioner/schedules/:id/save",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),id=Number(req.params.id);const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_schedules WHERE id=? AND parish_id=? AND schedule_date>=CURDATE()",[id,parishId]);if(!rows.length)return res.status(404).json({message:"저장할 일정을 찾을 수 없습니다."});await pool.execute("INSERT INTO parishioner_schedule_saves (parishioner_id,schedule_id) VALUES (?,?) ON DUPLICATE KEY UPDATE saved_at=NOW()",[userId,id]);res.json({message:"일정을 저장했습니다. 하루 전에 알림을 드립니다."})}catch(error){next(error)}});
app.get("/api/parishioner/schedules/:id/attachment",requireParishioner,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT attachment_name AS name,attachment_type AS type,attachment_data AS data FROM parish_schedules WHERE id=? AND parish_id=? LIMIT 1",[Number(req.params.id),Number(res.locals.parishioner.parish_id)]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type||"application/octet-stream"));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});
const catacombReactions=new Set(["pat","cheer","sad","empathy","same","hug"]);
const missionReactions=new Set(["like","best","cheer","funny","cool"]),missionQaReactions=new Set(["like","best","cheer","funny","cool","sad","regret"]),prayerReactions=new Set(["like","best","cheer","funny","cool"]);
const suggestionReactions=new Set(["like","best","cheer","funny","cool","dislike"]);
async function currentParishionerId(res:express.Response){const parishId=Number(res.locals.parishioner.parish_id),userKey=String(res.locals.parishioner.user_key),email=userKey.slice(userKey.indexOf(":")+1);const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM parishioners WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]);return Number(rows[0]?.id??0)}
async function parishionerGroupAccess(res:express.Response,groupId:number){const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT g.id,g.name_ko,(g.creator_parishioner_id=?) AS isOwner,EXISTS(SELECT 1 FROM parish_group_members gm WHERE gm.group_id=g.id AND gm.parishioner_id=? AND gm.status='approved') AS isMember FROM parish_groups g WHERE g.id=? AND g.parish_id=? AND g.status='approved' LIMIT 1",[userId,userId,groupId,parishId]);if(!rows.length)return null;return{userId,name:String(rows[0]!.name_ko),isOwner:Boolean(rows[0]!.isOwner),isMember:Boolean(rows[0]!.isMember)}}
app.get("/api/parishioner/shrines",requireParishioner,async(_req,res,next)=>{try{const userId=await currentParishionerId(res),parishId=Number(res.locals.parishioner.parish_id);const [rows]=await pool.query<RowDataPacket[]>(`SELECT s.id,s.diocese,s.name,s.address,s.website_url AS websiteUrl,v.id AS visitId,DATE_FORMAT(v.visited_at,'%Y-%m-%d') AS visitedDate,(SELECT COUNT(*) FROM shrine_visit_photos p WHERE p.visit_id=v.id AND p.enabled=1) AS photoCount,(SELECT COUNT(DISTINCT COALESCE(p2.review_group_id,CONCAT('legacy-',p2.id))) FROM shrine_visit_photos p2 INNER JOIN shrine_pilgrim_visits v2 ON v2.id=p2.visit_id INNER JOIN parishioners a2 ON a2.id=v2.parishioner_id WHERE v2.shrine_id=s.id AND a2.parish_id=? AND p2.enabled=1) AS reviewCount,(SELECT GROUP_CONCAT(CONCAT(a3.name,IF(a3.baptismal_name IS NULL OR a3.baptismal_name='', '',CONCAT('(',a3.baptismal_name,')'))) ORDER BY v3.visited_at DESC,a3.name SEPARATOR '\n') FROM shrine_pilgrim_visits v3 INNER JOIN parishioners a3 ON a3.id=v3.parishioner_id WHERE v3.shrine_id=s.id AND a3.parish_id=?) AS visitorNames FROM catholic_shrines s LEFT JOIN shrine_pilgrim_visits v ON v.shrine_id=s.id AND v.parishioner_id=? WHERE s.enabled=1 ORDER BY v.visited_at DESC,s.diocese,s.source_order,s.name`,[parishId,parishId,userId]);res.json(rows.map(row=>({...row,id:Number(row.id),visitId:row.visitId?Number(row.visitId):null,visited:Boolean(row.visitId),photoCount:Number(row.photoCount),reviewCount:Number(row.reviewCount),visitorNames:String(row.visitorNames||'').split('\n').filter(Boolean)})))}catch(error){next(error)}});
app.put("/api/parishioner/shrines/:id/visit",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),shrineId=Number(req.params.id),visitedDate=String(req.body.visitedDate??"");if(!Number.isSafeInteger(shrineId)||shrineId<1||!/^\d{4}-\d{2}-\d{2}$/.test(visitedDate)||visitedDate>new Date().toISOString().slice(0,10))return res.status(400).json({message:"방문한 날짜를 확인해 주세요."});const [shrines]=await pool.query<RowDataPacket[]>("SELECT id FROM catholic_shrines WHERE id=? AND enabled=1",[shrineId]);if(!shrines.length)return res.status(404).json({message:"성지 정보를 찾을 수 없습니다."});await pool.execute("INSERT INTO shrine_pilgrim_visits (shrine_id,parishioner_id,visited_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE visited_at=VALUES(visited_at)",[shrineId,userId,`${visitedDate} 00:00:00`]);res.json({message:"성지 방문 기록을 저장했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/shrines/:id/photos",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),shrineId=Number(req.params.id);const [rows]=await pool.query<RowDataPacket[]>("SELECT p.id,p.title,p.review_text AS reviewText,p.tags,p.created_at AS createdAt FROM shrine_visit_photos p INNER JOIN shrine_pilgrim_visits v ON v.id=p.visit_id WHERE v.shrine_id=? AND v.parishioner_id=? AND p.enabled=1 ORDER BY p.created_at DESC,p.id DESC",[shrineId,userId]);res.json(rows.map(row=>({...row,id:Number(row.id),tags:String(row.tags||'').split(',').filter(Boolean),imageUrl:`/api/parishioner/shrine-photos/${row.id}/image`})))}catch(error){next(error)}});
app.get("/api/parishioner/shrine-reviews",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id);const [rows]=await pool.query<RowDataPacket[]>("SELECT p.id,p.review_group_id AS reviewGroupId,p.title,p.review_text AS reviewText,p.tags,p.created_at AS createdAt,s.name AS shrineName,s.diocese,a.name AS authorName,a.baptismal_name AS baptismalName,DATE_FORMAT(v.visited_at,'%Y-%m-%d') AS visitedDate FROM shrine_visit_photos p INNER JOIN shrine_pilgrim_visits v ON v.id=p.visit_id INNER JOIN catholic_shrines s ON s.id=v.shrine_id INNER JOIN parishioners a ON a.id=v.parishioner_id WHERE a.parish_id=? AND p.enabled=1 ORDER BY p.created_at DESC,p.id DESC",[parishId]),grouped=new Map<string,Record<string,unknown>>();for(const row of rows){const key=String(row.reviewGroupId||`legacy-${row.id}`),imageUrl=`/api/parishioner/shrine-photos/${row.id}/image`,existing=grouped.get(key);if(existing){(existing.imageUrls as string[]).push(imageUrl);continue}grouped.set(key,{...row,id:Number(row.id),tags:String(row.tags||'').split(',').filter(Boolean),imageUrl,imageUrls:[imageUrl]})}res.json([...grouped.values()])}catch(error){next(error)}});
const shrineReviewReactionTypes=new Set(["like","best","cheer","empathy","thanks"]);
app.get("/api/parishioner/shrine-reviews/community-summary",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id);const [reviews]=await pool.query<RowDataPacket[]>("SELECT r.id FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE p.parish_id=? AND r.enabled=1",[parishId]),ids=reviews.map(row=>Number(row.id));if(!ids.length)return res.json([]);const [reactions]=await pool.query<RowDataPacket[]>("SELECT review_id AS reviewId,reaction,COUNT(*) AS count FROM shrine_review_reactions WHERE review_id IN (?) GROUP BY review_id,reaction",[ids]),[comments]=await pool.query<RowDataPacket[]>("SELECT review_id AS reviewId,COUNT(*) AS count FROM shrine_review_comments WHERE review_id IN (?) GROUP BY review_id",[ids]),summaries=new Map<number,{reviewId:number;reactions:Record<string,number>;commentCount:number}>();ids.forEach(id=>summaries.set(id,{reviewId:id,reactions:{},commentCount:0}));reactions.forEach(row=>{const item=summaries.get(Number(row.reviewId));if(item)item.reactions[String(row.reaction)]=Number(row.count)});comments.forEach(row=>{const item=summaries.get(Number(row.reviewId));if(item)item.commentCount=Number(row.count)});res.json([...summaries.values()])}catch(error){next(error)}});
app.get("/api/parishioner/shrine-reviews/:id/community",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),reviewId=Number(req.params.id);const [reviews]=await pool.query<RowDataPacket[]>("SELECT r.id FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE r.id=? AND p.parish_id=? AND r.enabled=1 LIMIT 1",[reviewId,parishId]);if(!reviews.length)return res.status(404).json({message:"순례후기를 찾을 수 없습니다."});const [reactions]=await pool.query<RowDataPacket[]>("SELECT reaction,COUNT(*) AS count,MAX(parishioner_id=?) AS selected FROM shrine_review_reactions WHERE review_id=? GROUP BY reaction",[userId,reviewId]),[comments]=await pool.query<RowDataPacket[]>("SELECT c.id,c.content,c.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName,(c.author_id=?) AS mine FROM shrine_review_comments c INNER JOIN parishioners p ON p.id=c.author_id WHERE c.review_id=? ORDER BY c.created_at,c.id",[userId,reviewId]);res.json({reactions:reactions.map(row=>({reaction:row.reaction,count:Number(row.count),selected:Boolean(row.selected)})),comments:comments.map(row=>({...row,id:Number(row.id),mine:Boolean(row.mine)}))})}catch(error){next(error)}});
app.put("/api/parishioner/shrine-reviews/:id/reaction",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),reviewId=Number(req.params.id),reaction=String(req.body.reaction??"");if(!shrineReviewReactionTypes.has(reaction))return res.status(400).json({message:"표현을 확인해 주세요."});const [reviews]=await pool.query<RowDataPacket[]>("SELECT r.id FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE r.id=? AND p.parish_id=? AND r.enabled=1 LIMIT 1",[reviewId,parishId]);if(!reviews.length)return res.status(404).json({message:"순례후기를 찾을 수 없습니다."});const [existing]=await pool.query<RowDataPacket[]>("SELECT reaction FROM shrine_review_reactions WHERE review_id=? AND parishioner_id=?",[reviewId,userId]);if(existing[0]?.reaction===reaction)await pool.execute("DELETE FROM shrine_review_reactions WHERE review_id=? AND parishioner_id=?",[reviewId,userId]);else await pool.execute("INSERT INTO shrine_review_reactions (review_id,parishioner_id,reaction) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[reviewId,userId,reaction]);res.json({message:"표현을 반영했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/shrine-reviews/:id/comments",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),reviewId=Number(req.params.id),content=String(req.body.content??"").trim();if(!content||content.length>2000)return res.status(400).json({message:"댓글을 1~2,000자로 입력해 주세요."});const [reviews]=await pool.query<RowDataPacket[]>("SELECT r.id FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE r.id=? AND p.parish_id=? AND r.enabled=1 LIMIT 1",[reviewId,parishId]);if(!reviews.length)return res.status(404).json({message:"순례후기를 찾을 수 없습니다."});await pool.execute("INSERT INTO shrine_review_comments (review_id,author_id,content) VALUES (?,?,?)",[reviewId,userId,content]);res.status(201).json({message:"댓글을 등록했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/shrines/:id/photos",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),shrineId=Number(req.params.id),title=String(req.body.title??"").trim(),reviewText=String(req.body.reviewText??"").trim(),imageType=String(req.body.imageType??"").trim(),encoded=String(req.body.imageData??"").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/,""),tags=[...new Set(String(req.body.tags??"").split(/[,\s]+/).map(value=>value.replace(/^#/,"").trim()).filter(Boolean))].slice(0,20);if(!title||title.length>200)return res.status(400).json({message:"후기 제목을 200자 이하로 입력해 주세요."});if(!reviewText||reviewText.length>10000)return res.status(400).json({message:"순례 후기를 10,000자 이하로 작성해 주세요."});if(tags.some(tag=>tag.length>30))return res.status(400).json({message:"태그는 각각 30자 이하로 입력해 주세요."});if(!/^image\/(jpeg|png|webp|gif)$/i.test(imageType)||!encoded)return res.status(400).json({message:"JPG, PNG, WEBP 또는 GIF 사진을 선택해 주세요."});const imageData=Buffer.from(encoded,"base64");if(!imageData.length||imageData.length>5*1024*1024)return res.status(400).json({message:"사진은 5MB 이하로 등록해 주세요."});const [visits]=await pool.query<RowDataPacket[]>("SELECT id FROM shrine_pilgrim_visits WHERE shrine_id=? AND parishioner_id=? LIMIT 1",[shrineId,userId]);if(!visits.length)return res.status(403).json({message:"방문 기록을 먼저 등록해 주세요."});const visitId=Number(visits[0]!.id),tagText=tags.join(','),requestedGroup=String(req.body.reviewGroupId??"").trim();const [recent]=requestedGroup?[[{reviewGroupId:requestedGroup}]]:await pool.query<RowDataPacket[]>("SELECT review_group_id AS reviewGroupId FROM shrine_visit_photos WHERE visit_id=? AND title=? AND review_text=? AND COALESCE(tags,'')=? AND review_group_id IS NOT NULL AND created_at>=DATE_SUB(NOW(),INTERVAL 2 MINUTE) ORDER BY id DESC LIMIT 1",[visitId,title,reviewText,tagText]);const reviewGroupId=String(recent[0]?.reviewGroupId||crypto.randomUUID());const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO shrine_visit_photos (visit_id,title,review_text,review_group_id,tags,image_type,image_data) VALUES (?,?,?,?,?,?,?)",[visitId,title,reviewText,reviewGroupId,tagText,imageType,imageData]);res.status(201).json({message:"순례 후기를 등록했습니다.",id:result.insertId,reviewGroupId})}catch(error){next(error)}});
app.get("/api/parishioner/shrine-photos/:id/image",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),photoId=Number(req.params.id);const [rows]=await pool.query<RowDataPacket[]>("SELECT p.image_type AS imageType,p.image_data AS imageData FROM shrine_visit_photos p INNER JOIN shrine_pilgrim_visits v ON v.id=p.visit_id INNER JOIN parishioners a ON a.id=v.parishioner_id WHERE p.id=? AND a.parish_id=? AND p.enabled=1 LIMIT 1",[photoId,parishId]);if(!rows.length)return res.status(404).end();res.type(String(rows[0]!.imageType));res.setHeader("Cache-Control","private, no-store");res.send(rows[0]!.imageData)}catch(error){next(error)}});
app.get("/api/parishioner/catacomb/posts",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [posts]=await pool.query<RowDataPacket[]>(`SELECT p.id,p.title,p.content,p.tags,p.anonymous,p.created_at AS createdAt,a.name AS authorName,a.baptismal_name AS baptismalName,ur.reaction AS myReaction,
  (SELECT COUNT(*) FROM catacomb_reactions r WHERE r.post_id=p.id AND r.reaction='pat') AS pat,
  (SELECT COUNT(*) FROM catacomb_reactions r WHERE r.post_id=p.id AND r.reaction='cheer') AS cheer,
  (SELECT COUNT(*) FROM catacomb_reactions r WHERE r.post_id=p.id AND r.reaction='sad') AS sad,
  (SELECT COUNT(*) FROM catacomb_reactions r WHERE r.post_id=p.id AND r.reaction='empathy') AS empathy,
  (SELECT COUNT(*) FROM catacomb_reactions r WHERE r.post_id=p.id AND r.reaction='same') AS same,
  (SELECT COUNT(*) FROM catacomb_reactions r WHERE r.post_id=p.id AND r.reaction='hug') AS hug
  FROM catacomb_posts p INNER JOIN parishioners a ON a.id=p.author_id LEFT JOIN catacomb_reactions ur ON ur.post_id=p.id AND ur.parishioner_id=? WHERE p.parish_id=? AND (p.status='approved' OR p.author_id=?) ORDER BY p.created_at DESC,p.id DESC`,[userId,parishId,userId]);if(!posts.length)return res.json([]);const ids=posts.map(row=>Number(row.id)),marks=ids.map(()=>"?").join(",");const [comments]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.post_id AS postId,c.content,c.created_at AS createdAt,a.name AS authorName,(SELECT COUNT(*) FROM catacomb_comment_likes l WHERE l.comment_id=c.id) AS likeCount,EXISTS(SELECT 1 FROM catacomb_comment_likes l WHERE l.comment_id=c.id AND l.parishioner_id=?) AS liked FROM catacomb_comments c INNER JOIN parishioners a ON a.id=c.author_id WHERE c.post_id IN (${marks}) ORDER BY c.created_at,c.id`,[userId,...ids]);res.json(posts.map(row=>({id:Number(row.id),title:row.title,content:row.content,tags:String(row.tags||"").split(",").filter(Boolean),authorName:Boolean(row.anonymous)?"익명":`${row.authorName}${row.baptismalName?` (${row.baptismalName})`:""}`,anonymous:Boolean(row.anonymous),createdAt:row.createdAt,myReaction:row.myReaction??null,reactions:{pat:Number(row.pat),cheer:Number(row.cheer),sad:Number(row.sad),empathy:Number(row.empathy),same:Number(row.same),hug:Number(row.hug)},comments:comments.filter(comment=>Number(comment.postId)===Number(row.id)).map(comment=>({...comment,id:Number(comment.id),postId:Number(comment.postId),likeCount:Number(comment.likeCount),liked:Boolean(comment.liked)}))})))}catch(error){next(error)}});
app.post("/api/parishioner/catacomb/posts",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim(),anonymous=Boolean(req.body.anonymous),tags=[...new Set(String(req.body.tags??"").split(/[,\s]+/).map(value=>value.replace(/^#/,"").trim()).filter(Boolean))].slice(0,20);if(!title||!content)return res.status(400).json({message:"제목과 내용을 입력해 주세요."});if(title.length>200||content.length>20000||tags.some(tag=>tag.length>30))return res.status(400).json({message:"입력 가능한 글자 수를 확인해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO catacomb_posts (parish_id,author_id,title,content,tags,anonymous,status) VALUES (?,?,?,?,?,?,'requested')",[parishId,userId,title,content,tags.join(","),anonymous]);res.status(201).json({message:"카타콤 등록 요청이 완료되었습니다.",id:result.insertId})}catch(error){next(error)}});
app.put("/api/parishioner/catacomb/posts/:id/reaction",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),postId=Number(req.params.id),reaction=String(req.body.reaction??"");if(!catacombReactions.has(reaction))return res.status(400).json({message:"공감 항목을 선택해 주세요."});const [posts]=await pool.query<RowDataPacket[]>("SELECT id FROM catacomb_posts WHERE id=? AND parish_id=?",[postId,parishId]);if(!posts.length)return res.status(404).json({message:"게시글을 찾을 수 없습니다."});const [current]=await pool.query<RowDataPacket[]>("SELECT reaction FROM catacomb_reactions WHERE post_id=? AND parishioner_id=?",[postId,userId]);if(current[0]?.reaction===reaction){await pool.execute("DELETE FROM catacomb_reactions WHERE post_id=? AND parishioner_id=?",[postId,userId]);return res.json({message:"공감 선택을 취소했습니다."})}await pool.execute("INSERT INTO catacomb_reactions (post_id,parishioner_id,reaction) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[postId,userId,reaction]);res.json({message:"마음을 전했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/catacomb/posts/:id/comments",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),postId=Number(req.params.id),content=String(req.body.content??"").trim();if(!content||content.length>2000)return res.status(400).json({message:"댓글을 1자 이상 2,000자 이하로 입력해 주세요."});const [posts]=await pool.query<RowDataPacket[]>("SELECT id FROM catacomb_posts WHERE id=? AND parish_id=?",[postId,parishId]);if(!posts.length)return res.status(404).json({message:"게시글을 찾을 수 없습니다."});await pool.execute("INSERT INTO catacomb_comments (post_id,author_id,content) VALUES (?,?,?)",[postId,userId,content]);res.status(201).json({message:"댓글이 등록되었습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/catacomb/comments/:id/like",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),commentId=Number(req.params.id);const [comments]=await pool.query<RowDataPacket[]>("SELECT c.id FROM catacomb_comments c INNER JOIN catacomb_posts p ON p.id=c.post_id WHERE c.id=? AND p.parish_id=?",[commentId,parishId]);if(!comments.length)return res.status(404).json({message:"댓글을 찾을 수 없습니다."});const [likes]=await pool.query<RowDataPacket[]>("SELECT comment_id FROM catacomb_comment_likes WHERE comment_id=? AND parishioner_id=?",[commentId,userId]);if(likes.length)await pool.execute("DELETE FROM catacomb_comment_likes WHERE comment_id=? AND parishioner_id=?",[commentId,userId]);else await pool.execute("INSERT INTO catacomb_comment_likes (comment_id,parishioner_id) VALUES (?,?)",[commentId,userId]);res.json({message:likes.length?"댓글 좋아요를 취소했습니다.":"댓글을 좋아합니다."})}catch(error){next(error)}});
app.get("/api/parishioner/suggestions",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [items]=await pool.query<RowDataPacket[]>(`SELECT s.id,s.title,s.content,s.tags,s.anonymous,s.attachment_name AS attachmentName,s.status,s.decision_explanation AS decisionExplanation,s.action_content AS actionContent,s.decided_at AS decidedAt,s.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName,r.reaction AS myReaction FROM parish_suggestions s JOIN parishioners p ON p.id=s.author_id LEFT JOIN parish_suggestion_reactions r ON r.suggestion_id=s.id AND r.parishioner_id=? WHERE s.parish_id=? ORDER BY s.created_at DESC,s.id DESC`,[userId,parishId]);const ids=items.map(row=>Number(row.id));let reactions:RowDataPacket[]=[],comments:RowDataPacket[]=[];if(ids.length){const marks=ids.map(()=>'?').join(',');[reactions]=await pool.query<RowDataPacket[]>(`SELECT suggestion_id AS suggestionId,reaction,COUNT(*) AS count FROM parish_suggestion_reactions WHERE suggestion_id IN (${marks}) GROUP BY suggestion_id,reaction`,ids);[comments]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.suggestion_id AS suggestionId,c.content,c.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM parish_suggestion_comments c JOIN parishioners p ON p.id=c.author_id WHERE c.suggestion_id IN (${marks}) ORDER BY c.created_at,c.id`,ids)}res.json(items.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous),authorName:Boolean(row.anonymous)?"익명":`${row.authorName}${row.baptismalName?` (${row.baptismalName})`:""}`,tags:String(row.tags||'').split(',').filter(Boolean),reactions:reactions.filter(r=>Number(r.suggestionId)===Number(row.id)).map(r=>({reaction:r.reaction,count:Number(r.count)})),comments:comments.filter(c=>Number(c.suggestionId)===Number(row.id)).map(c=>({...c,id:Number(c.id)}))})))}catch(error){next(error)}});
app.post("/api/parishioner/suggestions",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),title=String(req.body.title??'').trim(),content=String(req.body.content??'').trim(),anonymous=req.body.anonymous===true,tags=[...new Set(String(req.body.tags??'').split(/[,\s]+/).map(v=>v.replace(/^#/,'').trim()).filter(Boolean))].slice(0,20),file=req.body.attachment;if(!title||!content||title.length>200||content.length>20000||tags.some(t=>t.length>30))return res.status(400).json({message:"제목, 내용 및 태그 길이를 확인해 주세요."});let fileName=null,fileType=null,fileData:Buffer|null=null;if(file){fileName=String(file.name??'').slice(0,255);fileType=String(file.type??'application/octet-stream').slice(0,150);fileData=Buffer.from(String(file.data??''),'base64');if(!fileName||!fileData.length||fileData.length>5*1024*1024)return res.status(400).json({message:"첨부파일은 5MB 이하로 등록해 주세요."})}const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_suggestions (parish_id,author_id,title,content,tags,anonymous,attachment_name,attachment_type,attachment_data) VALUES (?,?,?,?,?,?,?,?,?)",[parishId,userId,title,content,tags.join(','),anonymous,fileName,fileType,fileData]);await pool.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'suggestion_request','새 제안 접수',?,'suggestion',?)",[parishId,`'${title}' 제안이 접수되었습니다.`,result.insertId]);res.status(201).json({message:"제안이 제출되었습니다.",id:result.insertId})}catch(error){next(error)}});
app.put("/api/parishioner/suggestions/:id/reaction",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),id=Number(req.params.id),reaction=String(req.body.reaction??'');if(!suggestionReactions.has(reaction))return res.status(400).json({message:"반응을 선택해 주세요."});const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_suggestions WHERE id=? AND parish_id=?",[id,parishId]);if(!rows.length)return res.status(404).json({message:"제안을 찾을 수 없습니다."});const [current]=await pool.query<RowDataPacket[]>("SELECT reaction FROM parish_suggestion_reactions WHERE suggestion_id=? AND parishioner_id=?",[id,userId]);if(current[0]?.reaction===reaction)await pool.execute("DELETE FROM parish_suggestion_reactions WHERE suggestion_id=? AND parishioner_id=?",[id,userId]);else await pool.execute("INSERT INTO parish_suggestion_reactions VALUES (?,?,?,NOW()) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[id,userId,reaction]);res.json({message:"반응이 반영되었습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/suggestions/:id/comments",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),id=Number(req.params.id),content=String(req.body.content??'').trim();if(!content||content.length>2000)return res.status(400).json({message:"댓글을 2,000자 이하로 입력해 주세요."});const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_suggestions WHERE id=? AND parish_id=?",[id,parishId]);if(!rows.length)return res.status(404).json({message:"제안을 찾을 수 없습니다."});await pool.execute("INSERT INTO parish_suggestion_comments (suggestion_id,author_id,content) VALUES (?,?,?)",[id,userId,content]);res.status(201).json({message:"댓글이 등록되었습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/suggestions/:id/attachment",requireParishioner,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT attachment_name AS name,attachment_type AS type,attachment_data AS data FROM parish_suggestions WHERE id=? AND parish_id=?",[Number(req.params.id),Number(res.locals.parishioner.parish_id)]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});
app.get("/api/parishioner/suggestions-editable",requireParishioner,async(_req,res,next)=>{try{const userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT s.id FROM parish_suggestions s WHERE s.author_id=? AND s.read_at IS NULL AND s.status='requested' AND NOT EXISTS(SELECT 1 FROM parish_suggestion_comments c WHERE c.suggestion_id=s.id)",[userId]);res.json(rows.map(row=>Number(row.id)))}catch(error){next(error)}});
app.patch("/api/parishioner/suggestions/:id",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),id=Number(req.params.id),title=String(req.body.title??'').trim(),content=String(req.body.content??'').trim(),anonymous=req.body.anonymous===true,tags=[...new Set(String(req.body.tags??'').split(/[,\s]+/).map(v=>v.replace(/^#/,'').trim()).filter(Boolean))].slice(0,20);if(!title||!content||title.length>200||content.length>20000||tags.some(tag=>tag.length>30))return res.status(400).json({message:"제목, 내용 및 태그 길이를 확인해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_suggestions s SET s.title=?,s.content=?,s.tags=?,s.anonymous=? WHERE s.id=? AND s.parish_id=? AND s.author_id=? AND s.read_at IS NULL AND s.status='requested' AND NOT EXISTS(SELECT 1 FROM parish_suggestion_comments c WHERE c.suggestion_id=s.id)",[title,content,tags.join(','),anonymous,id,parishId,userId]);if(!result.affectedRows)return res.status(409).json({message:"담당자가 읽었거나 댓글이 등록된 제안은 수정할 수 없습니다."});res.json({message:"제안이 수정되었습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/missions",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim(),anonymous=req.body.anonymous===true,applicationFrom=String(req.body.applicationFrom??""),applicationTo=String(req.body.applicationTo??""),iconType=String(req.body.iconType??"").trim(),iconDataText=String(req.body.iconData??""),tags=[...new Set(String(req.body.tags??"").split(/[,\s]+/).map(value=>value.replace(/^#/,"").trim()).filter(Boolean))].slice(0,20);if(!title||!content)return res.status(400).json({message:"제목과 내용을 입력해 주세요."});if(!/^\d{4}-\d{2}-\d{2}$/.test(applicationFrom)||!/^\d{4}-\d{2}-\d{2}$/.test(applicationTo)||applicationFrom>applicationTo)return res.status(400).json({message:"필수 미션 기간을 확인해 주세요."});if(title.length>200||content.length>20000||tags.some(tag=>tag.length>30))return res.status(400).json({message:"입력 가능한 글자 수를 확인해 주세요."});if(iconDataText&&!/^image\/(jpeg|png|webp|gif|svg\+xml)$/i.test(iconType))return res.status(400).json({message:"미션 아이콘은 이미지 파일만 등록할 수 있습니다."});const iconData=iconDataText?Buffer.from(iconDataText,"base64"):null;if(iconData&&iconData.length>2*1024*1024)return res.status(400).json({message:"미션 아이콘은 2MB 이하로 등록해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO sharing_missions (parish_id,author_id,title,content,tags,anonymous,icon_type,icon_data,application_from,application_to) VALUES (?,?,?,?,?,?,?,?,?,?)",[parishId,userId,title,content,tags.join(","),anonymous,iconData?iconType:null,iconData,applicationFrom,applicationTo]);await pool.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'mission_approval_request','미션 승인 요청',?,'mission',?)",[parishId,`'${title}' 미션 승인 요청이 도착했습니다.`,result.insertId]);res.status(201).json({message:"미션 승인 요청이 등록되었습니다.",id:result.insertId})}catch(error){next(error)}});
app.get("/api/parishioner/missions/mine",requireParishioner,async(_req,res,next)=>{try{const userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT m.id,m.title,m.content,m.tags,m.anonymous,m.status,(m.icon_data IS NOT NULL) AS hasIcon,DATE_FORMAT(m.application_from,'%Y-%m-%d') AS applicationFrom,DATE_FORMAT(m.application_to,'%Y-%m-%d') AS applicationTo,m.rejection_reason AS rejectionReason,m.decided_at AS decidedAt,m.created_at AS createdAt,(SELECT COUNT(*) FROM sharing_mission_applications a WHERE a.mission_id=m.id) AS applicationCount,(SELECT COUNT(*) FROM sharing_mission_applications a WHERE a.mission_id=m.id AND a.status='approved') AS approvedApplicationCount,(SELECT COUNT(*) FROM sharing_mission_applications a WHERE a.mission_id=m.id AND a.status='rejected') AS rejectedApplicationCount FROM sharing_missions m WHERE m.author_id=? ORDER BY m.created_at DESC,m.id DESC",[userId]);res.json(rows.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous),hasIcon:Boolean(row.hasIcon),applicationCount:Number(row.applicationCount),approvedApplicationCount:Number(row.approvedApplicationCount),rejectedApplicationCount:Number(row.rejectedApplicationCount),tags:String(row.tags||'').split(',').filter(Boolean)})))}catch(error){next(error)}});
app.get("/api/parishioner/missions/:id/icon",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),id=Number(req.params.id);const [rows]=await pool.query<RowDataPacket[]>("SELECT icon_type AS type,icon_data AS data FROM sharing_missions WHERE id=? AND parish_id=? LIMIT 1",[id,parishId]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type||"image/png"));res.setHeader("Cache-Control","private, max-age=3600");res.send(rows[0]!.data)}catch(error){next(error)}});
app.post("/api/parishioner/missions/:id/edit-request",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim(),applicationFrom=String(req.body.applicationFrom??""),applicationTo=String(req.body.applicationTo??""),iconType=String(req.body.iconType??"").trim(),iconText=String(req.body.iconData??""),tags=[...new Set(String(req.body.tags??"").split(/[,\s]+/).map(value=>value.replace(/^#/,"").trim()).filter(Boolean))].slice(0,20);if(!title||!content||title.length>200||content.length>20000||!/^\d{4}-\d{2}-\d{2}$/.test(applicationFrom)||!/^\d{4}-\d{2}-\d{2}$/.test(applicationTo)||applicationFrom>applicationTo)return res.status(400).json({message:"수정할 미션 내용을 확인해 주세요."});const [missions]=await pool.query<RowDataPacket[]>("SELECT id FROM sharing_missions WHERE id=? AND parish_id=? AND author_id=? AND author_type='parishioner'",[missionId,parishId,userId]);if(!missions.length)return res.status(403).json({message:"본인이 등록한 미션만 수정할 수 있습니다."});const iconData=iconText?Buffer.from(iconText,"base64"):null;if(iconData&&(!iconType.startsWith("image/")||iconData.length>2*1024*1024))return res.status(400).json({message:"아이콘 이미지는 2MB 이하로 등록해 주세요."});await pool.execute("INSERT INTO sharing_mission_edit_requests (mission_id,title,content,tags,application_from,application_to,icon_type,icon_data,status,rejection_reason,requested_at,decided_at) VALUES (?,?,?,?,?,?,?,?,'requested',NULL,NOW(),NULL) ON DUPLICATE KEY UPDATE title=VALUES(title),content=VALUES(content),tags=VALUES(tags),application_from=VALUES(application_from),application_to=VALUES(application_to),icon_type=VALUES(icon_type),icon_data=VALUES(icon_data),status='requested',rejection_reason=NULL,requested_at=NOW(),decided_at=NULL",[missionId,title,content,tags.join(','),applicationFrom,applicationTo,iconData?iconType:null,iconData]);await pool.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'mission_edit_request','미션 수정 승인 요청',?,'mission',?)",[parishId,`'${title}' 미션 수정 요청이 도착했습니다.`,missionId]);res.status(201).json({message:"미션 수정 승인 요청을 전달했습니다."})}catch(error){next(error)}});
app.get("/api/parish/mission-edit-requests",requireParish,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id);const [rows]=await pool.query<RowDataPacket[]>("SELECT e.id,e.mission_id AS missionId,e.title,e.content,e.tags,DATE_FORMAT(e.application_from,'%Y-%m-%d') AS applicationFrom,DATE_FORMAT(e.application_to,'%Y-%m-%d') AS applicationTo,e.requested_at AS requestedAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM sharing_mission_edit_requests e INNER JOIN sharing_missions m ON m.id=e.mission_id INNER JOIN parishioners p ON p.id=m.author_id WHERE m.parish_id=? AND e.status='requested' ORDER BY e.requested_at DESC",[parishId]);res.json(rows.map(row=>({...row,id:Number(row.id),missionId:Number(row.missionId),tags:String(row.tags||'').split(',').filter(Boolean)})))}catch(error){next(error)}});
app.patch("/api/parish/mission-edit-requests/:id/decision",requireParish,async(req,res,next)=>{const connection=await pool.getConnection();try{const parishId=Number(res.locals.parishSession.parish_id),id=Number(req.params.id),status=String(req.body.status??""),reason=String(req.body.rejectionReason??"").trim();if(!["approved","rejected"].includes(status)||status==="rejected"&&!reason)return res.status(400).json({message:"승인 또는 반려 사유를 확인해 주세요."});await connection.beginTransaction();const [rows]=await connection.query<RowDataPacket[]>("SELECT e.*,m.author_id,m.title AS currentTitle FROM sharing_mission_edit_requests e INNER JOIN sharing_missions m ON m.id=e.mission_id WHERE e.id=? AND m.parish_id=? AND e.status='requested' FOR UPDATE",[id,parishId]);if(!rows.length){await connection.rollback();return res.status(404).json({message:"처리할 수정 요청을 찾을 수 없습니다."})}const item=rows[0]!;if(status==="approved")await connection.execute("UPDATE sharing_missions SET title=?,content=?,tags=?,application_from=?,application_to=?,icon_type=COALESCE(?,icon_type),icon_data=COALESCE(?,icon_data) WHERE id=?",[item.title,item.content,item.tags,item.application_from,item.application_to,item.icon_type,item.icon_data,item.mission_id]);await connection.execute("UPDATE sharing_mission_edit_requests SET status=?,rejection_reason=?,decided_at=NOW() WHERE id=?",[status,status==="rejected"?reason:null,id]);await connection.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'mission',?)",[parishId,item.author_id,"mission_edit_decision","미션 수정 결과",status==="approved"?`'${item.title}' 수정 내용이 승인되어 반영되었습니다.`:`'${item.currentTitle}' 수정 요청이 반려되었습니다. 사유: ${reason}`,item.mission_id]);await connection.commit();res.json({message:status==="approved"?"수정 내용을 승인·반영했습니다.":"수정 요청을 반려했습니다."})}catch(error){await connection.rollback();next(error)}finally{connection.release()}});
app.get("/api/parishioner/talent/missions",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>(`SELECT m.id,m.title,m.content,m.tags,m.anonymous,m.author_type AS authorType,m.author_name AS missionAuthorName,(m.author_type='parishioner' AND m.author_id=?) AS isOwner,DATE_FORMAT(m.application_from,'%Y-%m-%d') AS applicationFrom,DATE_FORMAT(m.application_to,'%Y-%m-%d') AS applicationTo,(CURDATE() BETWEEN m.application_from AND m.application_to) AS applicationOpen,m.created_at AS createdAt,a.name AS authorName,a.baptismal_name AS baptismalName,(SELECT ma.status FROM sharing_mission_applications ma WHERE ma.mission_id=m.id AND ma.parishioner_id=? LIMIT 1) AS applicationStatus,(SELECT ma.rejection_reason FROM sharing_mission_applications ma WHERE ma.mission_id=m.id AND ma.parishioner_id=? LIMIT 1) AS applicationRejectionReason,(SELECT ma.decided_at FROM sharing_mission_applications ma WHERE ma.mission_id=m.id AND ma.parishioner_id=? LIMIT 1) AS applicationDecidedAt,(SELECT COUNT(*) FROM sharing_mission_applications ma WHERE ma.mission_id=m.id) AS applicationCount,(SELECT COUNT(*) FROM sharing_mission_applications ma WHERE ma.mission_id=m.id AND ma.status='requested') AS requestedApplicationCount,(SELECT COUNT(*) FROM sharing_mission_applications ma WHERE ma.mission_id=m.id AND ma.status='approved') AS approvedApplicationCount FROM sharing_missions m LEFT JOIN parishioners a ON a.id=m.author_id WHERE m.parish_id=? AND m.status='approved' ORDER BY applicationOpen DESC,m.decided_at DESC,m.id DESC`,[userId,userId,userId,userId,parishId]);res.json(rows.map(row=>({...row,id:Number(row.id),authorName:row.authorType==="parish"?String(row.missionAuthorName):Boolean(row.anonymous)?"익명":`${row.authorName}${row.baptismalName?` (${row.baptismalName})`:""}`,isOwner:Boolean(row.isOwner),anonymous:Boolean(row.anonymous),applicationOpen:Boolean(row.applicationOpen),applicationStatus:row.applicationStatus??null,applied:Boolean(row.applicationStatus),applicationCount:Number(row.applicationCount),requestedApplicationCount:Number(row.requestedApplicationCount),approvedApplicationCount:Number(row.approvedApplicationCount),tags:String(row.tags||'').split(',').filter(Boolean)})))}catch(error){next(error)}});
app.post("/api/parishioner/missions/:id/apply",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id),message=String(req.body.message??"").trim();if(!message||message.length>2000)return res.status(400).json({message:"미션 등록자에게 전달할 메시지를 2,000자 이하로 입력해 주세요."});const [missions]=await pool.query<RowDataPacket[]>("SELECT id,author_id FROM sharing_missions WHERE id=? AND parish_id=? AND status='approved' AND CURDATE() BETWEEN application_from AND application_to",[missionId,parishId]);if(!missions.length)return res.status(404).json({message:"모집 기간이 아니거나 지원할 수 없는 미션입니다."});if(Number(missions[0]!.author_id)===userId)return res.status(403).json({message:"자신이 등록한 미션에는 지원할 수 없습니다."});const [existing]=await pool.query<RowDataPacket[]>("SELECT id,status FROM sharing_mission_applications WHERE mission_id=? AND parishioner_id=?",[missionId,userId]);if(existing.length&&existing[0]!.status!=="rejected")return res.status(409).json({message:"이미 지원한 미션입니다."});if(existing.length)await pool.execute("UPDATE sharing_mission_applications SET message=?,status='requested',rejection_reason=NULL,decided_at=NULL,created_at=NOW() WHERE id=?",[message,existing[0]!.id]);else await pool.execute("INSERT INTO sharing_mission_applications (mission_id,parishioner_id,message,status) VALUES (?,?,?,'requested')",[missionId,userId,message]);res.status(201).json({message:existing.length?"미션에 다시 지원했습니다.":"미션 지원 요청을 등록자에게 전달했습니다."})}catch(error){next(error)}});
app.delete("/api/parishioner/missions/:id/application",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),missionId=Number(req.params.id);const [result]=await pool.execute<mysql.ResultSetHeader>("DELETE FROM sharing_mission_applications WHERE mission_id=? AND parishioner_id=? AND status='requested'",[missionId,userId]);if(!result.affectedRows)return res.status(409).json({message:"등록자가 이미 결정했거나 취소할 수 있는 지원 요청이 없습니다."});res.json({message:"미션 지원 요청을 취소했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/missions/:id/activity-logs",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id);const [access]=await pool.query<RowDataPacket[]>("SELECT m.id FROM sharing_missions m LEFT JOIN sharing_mission_applications a ON a.mission_id=m.id AND a.parishioner_id=? AND a.status='approved' WHERE m.id=? AND m.parish_id=? AND (m.author_id=? OR a.id IS NOT NULL) LIMIT 1",[userId,missionId,parishId,userId]);if(!access.length)return res.status(403).json({message:"미션 등록자 또는 승인된 참여자만 활동일지를 확인할 수 있습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT l.id,l.author_id AS authorId,DATE_FORMAT(l.activity_date,'%Y-%m-%d') AS activityDate,TIME_FORMAT(l.time_from,'%H:%i') AS timeFrom,TIME_FORMAT(l.time_to,'%H:%i') AS timeTo,l.content,l.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM sharing_mission_activity_logs l INNER JOIN parishioners p ON p.id=l.author_id WHERE l.mission_id=? ORDER BY l.activity_date DESC,l.time_from DESC,l.id DESC",[missionId]);res.json(rows.map(row=>({...row,id:Number(row.id),mine:Number(row.authorId)===userId,authorName:`${row.authorName}${row.baptismalName?` (${row.baptismalName})`:""}`})))}catch(error){next(error)}});
app.post("/api/parishioner/missions/:id/activity-logs",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id),activityDate=String(req.body.activityDate??""),timeFrom=String(req.body.timeFrom??""),timeTo=String(req.body.timeTo??""),content=String(req.body.content??"").trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(activityDate)||!/^\d{2}:\d{2}$/.test(timeFrom)||!/^\d{2}:\d{2}$/.test(timeTo)||timeFrom>=timeTo)return res.status(400).json({message:"활동일과 시작·종료 시간을 확인해 주세요."});if(!content||content.length>5000)return res.status(400).json({message:"한 일을 5,000자 이내로 작성해 주세요."});const [access]=await pool.query<RowDataPacket[]>("SELECT a.id FROM sharing_mission_applications a INNER JOIN sharing_missions m ON m.id=a.mission_id WHERE a.mission_id=? AND a.parishioner_id=? AND a.status='approved' AND m.parish_id=?",[missionId,userId,parishId]);if(!access.length)return res.status(403).json({message:"미션 참여자만 활동일지를 작성할 수 있습니다."});const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO sharing_mission_activity_logs (mission_id,author_id,activity_date,time_from,time_to,content) VALUES (?,?,?,?,?,?)",[missionId,userId,activityDate,timeFrom,timeTo,content]);res.status(201).json({message:"활동일지를 등록했습니다.",id:result.insertId})}catch(error){next(error)}});
app.get("/api/parishioner/missions/:id/applicants",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),missionId=Number(req.params.id);const [missions]=await pool.query<RowDataPacket[]>("SELECT id,title FROM sharing_missions WHERE id=? AND author_id=?",[missionId,userId]);if(!missions.length)return res.status(404).json({message:"지원자를 확인할 수 있는 미션이 아닙니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT a.id,p.name,p.baptismal_name AS baptismalName,p.email,p.mobile,a.message,a.status,a.rejection_reason AS rejectionReason,DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i') AS appliedAt,CASE WHEN a.status='approved' THEN DATE_FORMAT(a.decided_at,'%Y-%m-%d %H:%i') ELSE NULL END AS approvedAt FROM sharing_mission_applications a INNER JOIN parishioners p ON p.id=a.parishioner_id WHERE a.mission_id=? ORDER BY FIELD(a.status,'requested','approved','rejected'),a.created_at DESC",[missionId]);res.json({mission:missions[0],items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.patch("/api/parishioner/mission-applications/:id/decision",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),applicationId=Number(req.params.id),status=String(req.body.status??""),rejectionReason=String(req.body.rejectionReason??"").trim();if(status!=="approved"&&status!=="rejected")return res.status(400).json({message:"승낙 또는 반려를 선택해 주세요."});if(status==="rejected"&&!rejectionReason)return res.status(400).json({message:"반려 사유를 입력해 주세요."});if(rejectionReason.length>1000)return res.status(400).json({message:"반려 사유는 1,000자 이내로 입력해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE sharing_mission_applications a INNER JOIN sharing_missions m ON m.id=a.mission_id SET a.status=?,a.rejection_reason=?,a.decided_at=NOW() WHERE a.id=? AND m.author_id=? AND a.status='requested'",[status,status==="rejected"?rejectionReason:null,applicationId,userId]);if(!result.affectedRows)return res.status(404).json({message:"처리할 지원 요청을 찾을 수 없습니다."});res.json({message:status==="approved"?"미션 지원을 승낙했습니다.":"미션 지원을 반려했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/missions/:id/community",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id);const [missions]=await pool.query<RowDataPacket[]>("SELECT id,author_id,author_type FROM sharing_missions WHERE id=? AND parish_id=? AND status='approved'",[missionId,parishId]);if(!missions.length)return res.status(404).json({message:"미션을 찾을 수 없습니다."});const [reactions]=await pool.query<RowDataPacket[]>("SELECT reaction,COUNT(*) AS count,MAX(parishioner_id=?) AS mine FROM sharing_mission_reactions WHERE mission_id=? GROUP BY reaction",[userId,missionId]);const [questions]=await pool.query<RowDataPacket[]>("SELECT q.id,q.asker_id AS askerId,q.question,q.anonymous,q.answer,q.created_at AS createdAt,q.answered_at AS answeredAt,p.name AS askerName,p.baptismal_name AS baptismalName FROM sharing_mission_questions q INNER JOIN parishioners p ON p.id=q.asker_id WHERE q.mission_id=? ORDER BY q.created_at DESC,q.id DESC",[missionId]);const ids=questions.map(row=>Number(row.id));let qa:RowDataPacket[]=[];if(ids.length){const marks=ids.map(()=>'?').join(',');[qa]=await pool.query<RowDataPacket[]>(`SELECT question_id AS questionId,target,reaction,COUNT(*) AS count,MAX(parishioner_id=?) AS mine FROM sharing_mission_qa_reactions WHERE question_id IN (${marks}) GROUP BY question_id,target,reaction`,[userId,...ids])}res.json({isOwner:Number(missions[0]!.author_id)===userId&&missions[0]!.author_type==='parishioner',reactions:reactions.map(row=>({reaction:row.reaction,count:Number(row.count),mine:Boolean(row.mine)})),questions:questions.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous),askerName:Boolean(row.anonymous)?"익명":`${row.askerName}${row.baptismalName?` (${row.baptismalName})`:''}`,canEdit:Number(row.askerId)===userId&&!row.answer,reactions:qa.filter(item=>Number(item.questionId)===Number(row.id)).map(item=>({target:item.target,reaction:item.reaction,count:Number(item.count),mine:Boolean(item.mine)}))}))})}catch(error){next(error)}});
app.put("/api/parishioner/missions/:id/reaction",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id),reaction=String(req.body.reaction??'');if(!missionReactions.has(reaction))return res.status(400).json({message:"반응을 선택해 주세요."});const [missions]=await pool.query<RowDataPacket[]>("SELECT id FROM sharing_missions WHERE id=? AND parish_id=? AND status='approved'",[missionId,parishId]);if(!missions.length)return res.status(404).json({message:"미션을 찾을 수 없습니다."});const [current]=await pool.query<RowDataPacket[]>("SELECT reaction FROM sharing_mission_reactions WHERE mission_id=? AND parishioner_id=?",[missionId,userId]);if(current[0]?.reaction===reaction)await pool.execute("DELETE FROM sharing_mission_reactions WHERE mission_id=? AND parishioner_id=?",[missionId,userId]);else await pool.execute("INSERT INTO sharing_mission_reactions (mission_id,parishioner_id,reaction) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[missionId,userId,reaction]);res.json({message:"반응을 반영했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/missions/:id/questions",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),missionId=Number(req.params.id),question=String(req.body.question??'').trim(),anonymous=req.body.anonymous===true;if(!question||question.length>2000)return res.status(400).json({message:"질문을 2,000자 이하로 입력해 주세요."});const [missions]=await pool.query<RowDataPacket[]>("SELECT id,author_id FROM sharing_missions WHERE id=? AND parish_id=? AND status='approved'",[missionId,parishId]);if(!missions.length)return res.status(404).json({message:"미션을 찾을 수 없습니다."});if(Number(missions[0]!.author_id)===userId)return res.status(403).json({message:"자신이 등록한 미션에는 질문할 수 없습니다."});await pool.execute("INSERT INTO sharing_mission_questions (mission_id,asker_id,question,anonymous) VALUES (?,?,?,?)",[missionId,userId,question,anonymous]);res.status(201).json({message:"질문을 등록했습니다."})}catch(error){next(error)}});
app.patch("/api/parishioner/mission-questions/:id",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),questionId=Number(req.params.id),question=String(req.body.question??'').trim(),anonymous=req.body.anonymous===true;if(!question||question.length>2000)return res.status(400).json({message:"질문을 2,000자 이하로 입력해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE sharing_mission_questions SET question=?,anonymous=? WHERE id=? AND asker_id=? AND answer IS NULL",[question,anonymous,questionId,userId]);if(!result.affectedRows)return res.status(403).json({message:"답변 등록 전 본인이 작성한 질문만 수정할 수 있습니다."});res.json({message:"질문을 수정했습니다."})}catch(error){next(error)}});
app.patch("/api/parishioner/mission-questions/:id/answer",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),questionId=Number(req.params.id),answer=String(req.body.answer??'').trim();if(!answer||answer.length>5000)return res.status(400).json({message:"답변을 5,000자 이하로 입력해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE sharing_mission_questions q INNER JOIN sharing_missions m ON m.id=q.mission_id SET q.answer=?,q.answered_at=NOW() WHERE q.id=? AND m.author_id=? AND m.author_type='parishioner'",[answer,questionId,userId]);if(!result.affectedRows)return res.status(403).json({message:"미션 등록자만 답변할 수 있습니다."});res.json({message:"답변을 등록했습니다."})}catch(error){next(error)}});
app.put("/api/parishioner/mission-questions/:id/reaction",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),questionId=Number(req.params.id),target=String(req.body.target??''),reaction=String(req.body.reaction??'');if((target!=="question"&&target!=="answer")||!missionQaReactions.has(reaction))return res.status(400).json({message:"반응을 확인해 주세요."});const [questions]=await pool.query<RowDataPacket[]>("SELECT q.answer FROM sharing_mission_questions q INNER JOIN sharing_missions m ON m.id=q.mission_id WHERE q.id=? AND m.parish_id=? AND m.status='approved'",[questionId,parishId]);if(!questions.length||target==='answer'&&!questions[0]!.answer)return res.status(404).json({message:"질문 또는 답변을 찾을 수 없습니다."});const [current]=await pool.query<RowDataPacket[]>("SELECT reaction FROM sharing_mission_qa_reactions WHERE question_id=? AND parishioner_id=? AND target=?",[questionId,userId,target]);if(current[0]?.reaction===reaction)await pool.execute("DELETE FROM sharing_mission_qa_reactions WHERE question_id=? AND parishioner_id=? AND target=?",[questionId,userId,target]);else await pool.execute("INSERT INTO sharing_mission_qa_reactions (question_id,parishioner_id,target,reaction) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[questionId,userId,target,reaction]);res.json({message:"반응을 반영했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/prayer-dream/recipients",requireParishioner,async(req,res,next)=>{
  try{
    const parishId=Number(res.locals.parishioner.parish_id);
    const userId=await currentParishionerId(res);
    const q=`%${String(req.query.q??"").trim()}%`;
    const [members]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,email,'신도' AS roleLabel FROM parishioners WHERE parish_id=? AND id<>? AND (name LIKE ? OR baptismal_name LIKE ? OR email LIKE ?) ORDER BY name LIMIT 20",[parishId,userId,q,q,q]);
    const [priests]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,'신부' AS email,'신부' AS roleLabel FROM parish_priests WHERE parish_id=? AND status='incoming' AND (name LIKE ? OR baptismal_name LIKE ? OR role LIKE ?) ORDER BY name LIMIT 20",[parishId,q,q,q]);
    const [nuns]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,'수녀' AS email,'수녀' AS roleLabel FROM parish_nuns WHERE parish_id=? AND status='incoming' AND (name LIKE ? OR baptismal_name LIKE ? OR role LIKE ?) ORDER BY name LIMIT 20",[parishId,q,q,q]);
    res.json([...members.map(row=>({...row,id:Number(row.id),personType:"parishioner"})),...priests.map(row=>({...row,id:-1000000000-Number(row.id),personType:"priest"})),...nuns.map(row=>({...row,id:-2000000000-Number(row.id),personType:"nun"}))].slice(0,30));
  }catch(error){next(error)}
});
app.post("/api/parishioner/prayer-dream",requireParishioner,async(req,res,next)=>{
  const encodedId=Number(req.body.recipientId);
  if(encodedId>=0)return next();
  try{
    const parishId=Number(res.locals.parishioner.parish_id),senderId=await currentParishionerId(res);
    const prayerText=String(req.body.prayerText??"").trim(),isPublic=req.body.isPublic===true;
    const type:"priest"|"nun"=encodedId<=-2000000000?"nun":"priest";
    const targetId=type==="nun"?(-2000000000-encodedId):(-1000000000-encodedId);
    const table=type==="nun"?"parish_nuns":"parish_priests";
    if(!prayerText||prayerText.length>10000)return res.status(400).json({message:"기도문을 10,000자 이내로 작성해 주세요."});
    const [targets]=await pool.query<RowDataPacket[]>(`SELECT id,name,baptismal_name AS baptismalName,email FROM ${table} WHERE id=? AND parish_id=? AND status='incoming' LIMIT 1`,[targetId,parishId]);
    if(!targets.length)return res.status(404).json({message:"기도 대상자를 찾을 수 없습니다."});
    const target=targets[0]!;
    const [linkedAccounts]=target.email?await pool.query<RowDataPacket[]>("SELECT id FROM parishioners WHERE parish_id=? AND email=? AND id<>? LIMIT 1",[parishId,normalizeEmail(target.email),senderId]):[[] as RowDataPacket[],[]];
    const linkedRecipientId=Number(linkedAccounts[0]?.id??0),storedRecipientId=linkedRecipientId||senderId;
    const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO prayer_dreams (parish_id,sender_id,recipient_id,target_type,target_ref_id,target_name,target_baptismal_name,prayer_text,is_public) VALUES (?,?,?,?,?,?,?,?,?)",[parishId,senderId,storedRecipientId,type,targetId,target.name,target.baptismalName||null,prayerText,isPublic]);
    if(linkedRecipientId)await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,'prayer_dream_received','새로운 기도드림','새 기도문이 도착했습니다.','prayer_dream',?)",[parishId,linkedRecipientId,result.insertId]);
    res.status(201).json({message:`${type==="nun"?"수녀":"신부"}님을 위한 기도문을 저장했습니다.`,id:result.insertId});
  }catch(error){next(error)}
});
app.post("/api/parishioner/prayer-dream",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),senderId=await currentParishionerId(res),recipientId=Number(req.body.recipientId),prayerText=String(req.body.prayerText??"").trim(),isPublic=req.body.isPublic===true,viewerIds=([...new Set((Array.isArray(req.body.viewerIds)?req.body.viewerIds:[]).map(Number).filter(Number.isInteger))].slice(0,100)) as number[],recipientIds=([...new Set((Array.isArray(req.body.recipientIds)?req.body.recipientIds:[]).map(Number).filter(Number.isInteger))].slice(0,100)) as number[];if(!prayerText||prayerText.length>10000)return res.status(400).json({message:"기도문을 10,000자 이내로 작성해 주세요."});const [people]=await pool.query<RowDataPacket[]>("SELECT id FROM parishioners WHERE id=? AND parish_id=? AND id<>?",[recipientId,parishId,senderId]);if(!people.length)return res.status(404).json({message:"기도 대상자를 찾을 수 없습니다."});const requestedIds=[...new Set<number>([...viewerIds,...recipientIds])],validIds=new Set<number>();if(requestedIds.length){const marks=requestedIds.map(()=>"?").join(",");const [members]=await pool.query<RowDataPacket[]>(`SELECT id FROM parishioners WHERE parish_id=? AND id<>? AND id IN (${marks})`,[parishId,senderId,...requestedIds]);members.forEach(row=>validIds.add(Number(row.id)))}const validRecipientIds=recipientIds.filter(id=>validIds.has(id)&&id!==recipientId),validViewerIds=isPublic?[]:viewerIds.filter(id=>validIds.has(id)&&id!==recipientId&&!validRecipientIds.includes(id));const connection=await pool.getConnection();try{await connection.beginTransaction();const [result]=await connection.execute<mysql.ResultSetHeader>("INSERT INTO prayer_dreams (parish_id,sender_id,recipient_id,prayer_text,is_public) VALUES (?,?,?,?,?)",[parishId,senderId,recipientId,prayerText,isPublic]);for(const extraRecipientId of validRecipientIds)await connection.execute("INSERT IGNORE INTO prayer_dream_recipients (prayer_id,parishioner_id) VALUES (?,?)",[result.insertId,extraRecipientId]);for(const viewerId of validViewerIds)await connection.execute("INSERT IGNORE INTO prayer_dream_viewers (prayer_id,parishioner_id) VALUES (?,?)",[result.insertId,viewerId]);const notificationIds=[...new Set<number>([recipientId,...validRecipientIds,...validViewerIds])];for(const targetId of notificationIds)await connection.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,'prayer_dream_received','새로운 기도드림','새 기도문이 도착했습니다.','prayer_dream',?)",[parishId,targetId,result.insertId]);await connection.commit();res.status(201).json({message:"기도문을 보냈습니다.",id:result.insertId})}catch(error){await connection.rollback();throw error}finally{connection.release()}}catch(error){next(error)}});
app.get("/api/parishioner/prayer-dream/clergy-targets",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT id,target_type AS targetType,target_name AS targetName,target_baptismal_name AS targetBaptismalName FROM prayer_dreams WHERE parish_id=? AND sender_id=? AND target_type IN ('priest','nun') ORDER BY id DESC",[parishId,userId]);res.json(rows.map(row=>({...row,id:Number(row.id)})))}catch(error){next(error)}});
app.get("/api/parishioner/prayer-dream",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>(`SELECT d.id,d.sender_id AS senderId,d.recipient_id AS recipientId,d.prayer_text AS prayerText,d.is_public AS isPublic,EXISTS(SELECT 1 FROM prayer_dream_viewers pv WHERE pv.prayer_id=d.id AND pv.parishioner_id=?) AS sharedWithMe,EXISTS(SELECT 1 FROM prayer_dream_recipients pr WHERE pr.prayer_id=d.id AND pr.parishioner_id=?) AS extraRecipient,(SELECT pr.read_at FROM prayer_dream_recipients pr WHERE pr.prayer_id=d.id AND pr.parishioner_id=? LIMIT 1) AS extraReadAt,d.created_at AS createdAt,d.read_at AS readAt,s.name AS senderName,s.baptismal_name AS senderBaptismalName,r.name AS recipientName,r.baptismal_name AS recipientBaptismalName,(SELECT reaction FROM prayer_dream_reactions WHERE prayer_id=d.id AND parishioner_id=? LIMIT 1) AS myReaction FROM prayer_dreams d INNER JOIN parishioners s ON s.id=d.sender_id INNER JOIN parishioners r ON r.id=d.recipient_id WHERE d.parish_id=? AND (d.is_public=1 OR d.sender_id=? OR d.recipient_id=? OR EXISTS(SELECT 1 FROM prayer_dream_viewers pv WHERE pv.prayer_id=d.id AND pv.parishioner_id=?) OR EXISTS(SELECT 1 FROM prayer_dream_recipients pr WHERE pr.prayer_id=d.id AND pr.parishioner_id=?)) ORDER BY d.created_at DESC,d.id DESC`,[userId,userId,userId,userId,parishId,userId,userId,userId,userId]);const ids=rows.map(row=>Number(row.id));let comments:RowDataPacket[]=[],reactions:RowDataPacket[]=[];if(ids.length){const marks=ids.map(()=>"?").join(",");[comments]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.prayer_id AS prayerId,c.author_id AS authorId,c.content,c.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM prayer_dream_comments c INNER JOIN parishioners p ON p.id=c.author_id WHERE c.prayer_id IN (${marks}) ORDER BY c.created_at`,ids);[reactions]=await pool.query<RowDataPacket[]>(`SELECT prayer_id AS prayerId,reaction,COUNT(*) AS count FROM prayer_dream_reactions WHERE prayer_id IN (${marks}) GROUP BY prayer_id,reaction`,ids)}res.json(rows.map(row=>({...row,id:Number(row.id),isPublic:Boolean(row.isPublic),sharedWithMe:Boolean(row.sharedWithMe),direction:Number(row.senderId)===userId?"sent":Number(row.recipientId)===userId||Boolean(row.extraRecipient)?"received":"public",unread:(Number(row.recipientId)===userId&&!row.readAt)||(Boolean(row.extraRecipient)&&!row.extraReadAt),comments:comments.filter(comment=>Number(comment.prayerId)===Number(row.id)).map(comment=>({...comment,id:Number(comment.id),authorName:`${comment.authorName}${comment.baptismalName?` (${comment.baptismalName})`:""}`})),reactions:reactions.filter(reaction=>Number(reaction.prayerId)===Number(row.id)).map(reaction=>({reaction:reaction.reaction,count:Number(reaction.count)}))})))}catch(error){next(error)}});
app.post("/api/parishioner/prayer-dream/:id/read",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),prayerId=Number(req.params.id);const [primary]=await pool.execute<mysql.ResultSetHeader>("UPDATE prayer_dreams SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND recipient_id=?",[prayerId,userId]);const [extra]=await pool.execute<mysql.ResultSetHeader>("UPDATE prayer_dream_recipients SET read_at=COALESCE(read_at,NOW()) WHERE prayer_id=? AND parishioner_id=?",[prayerId,userId]);if(!primary.affectedRows&&!extra.affectedRows)return res.status(404).json({message:"받은 기도문을 찾을 수 없습니다."});res.json({message:"기도문을 확인했습니다."})}catch(error){next(error)}});
app.patch("/api/parishioner/prayer-dream/:id",requireParishioner,async(req,res,next)=>{try{const userId=await currentParishionerId(res),prayerId=Number(req.params.id),prayerText=String(req.body.prayerText??"").trim();if(!prayerText||prayerText.length>10000)return res.status(400).json({message:"기도문을 10,000자 이내로 작성해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE prayer_dreams SET prayer_text=? WHERE id=? AND sender_id=? AND read_at IS NULL",[prayerText,prayerId,userId]);if(!result.affectedRows)return res.status(409).json({message:"상대방이 이미 읽었거나 수정할 수 없는 기도문입니다."});res.json({message:"기도문을 수정했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/prayer-dream/:id/comments",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),prayerId=Number(req.params.id),content=String(req.body.content??"").trim();if(!content||content.length>2000)return res.status(400).json({message:"댓글을 2,000자 이내로 작성해 주세요."});const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM prayer_dreams WHERE id=? AND parish_id=? AND (is_public=1 OR sender_id=? OR recipient_id=? OR EXISTS(SELECT 1 FROM prayer_dream_viewers WHERE prayer_id=prayer_dreams.id AND parishioner_id=?) OR EXISTS(SELECT 1 FROM prayer_dream_recipients WHERE prayer_id=prayer_dreams.id AND parishioner_id=?))",[prayerId,parishId,userId,userId,userId,userId]);if(!rows.length)return res.status(403).json({message:"댓글을 작성할 권한이 없습니다."});await pool.execute("INSERT INTO prayer_dream_comments (prayer_id,author_id,content) VALUES (?,?,?)",[prayerId,userId,content]);res.status(201).json({message:"댓글을 등록했습니다."})}catch(error){next(error)}});
app.put("/api/parishioner/prayer-dream/:id/reaction",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),prayerId=Number(req.params.id),reaction=String(req.body.reaction??"");if(!prayerReactions.has(reaction))return res.status(400).json({message:"반응을 선택해 주세요."});const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM prayer_dreams WHERE id=? AND parish_id=? AND (is_public=1 OR sender_id=? OR recipient_id=? OR EXISTS(SELECT 1 FROM prayer_dream_viewers WHERE prayer_id=prayer_dreams.id AND parishioner_id=?) OR EXISTS(SELECT 1 FROM prayer_dream_recipients WHERE prayer_id=prayer_dreams.id AND parishioner_id=?))",[prayerId,parishId,userId,userId,userId,userId]);if(!rows.length)return res.status(403).json({message:"반응을 선택할 권한이 없습니다."});const [current]=await pool.query<RowDataPacket[]>("SELECT reaction FROM prayer_dream_reactions WHERE prayer_id=? AND parishioner_id=?",[prayerId,userId]);if(current[0]?.reaction===reaction)await pool.execute("DELETE FROM prayer_dream_reactions WHERE prayer_id=? AND parishioner_id=?",[prayerId,userId]);else await pool.execute("INSERT INTO prayer_dream_reactions (prayer_id,parishioner_id,reaction) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[prayerId,userId,reaction]);res.json({message:"기도문에 마음을 전했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/groups", requireParishioner, async (_req, res, next) => { try { const parishId = Number(res.locals.parishioner.parish_id); const userKey = String(res.locals.parishioner.user_key); const email = userKey.slice(userKey.indexOf(":") + 1); const [rows] = await pool.query<RowDataPacket[]>("SELECT g.id,g.name_ko,g.name_en,g.description,g.regular_meeting,g.operator_name,g.status,g.created_at,g.approved_at,(g.icon_data IS NOT NULL) AS has_icon,gm.status AS membership_status,(g.creator_parishioner_id=p.id) AS is_operator,(SELECT COUNT(*) FROM parish_group_members mm WHERE mm.group_id=g.id AND mm.status='approved')+(g.creator_parishioner_id IS NOT NULL) AS member_count,(SELECT COUNT(*) FROM parish_group_members am WHERE am.group_id=g.id AND am.status='requested') AS application_count,(SELECT COUNT(*) FROM parish_group_members wm WHERE wm.group_id=g.id AND wm.status='withdrawal_requested') AS withdrawal_count FROM parish_groups g LEFT JOIN parishioners p ON p.parish_id=g.parish_id AND p.email=? LEFT JOIN parish_group_members gm ON gm.group_id=g.id AND gm.parishioner_id=p.id WHERE g.parish_id=? AND (g.status='approved' OR g.creator_parishioner_id=p.id) ORDER BY is_operator DESC,(gm.status='approved') DESC,g.created_at DESC,g.id DESC", [email, parishId]); res.json(rows.map((row) => ({ ...groupDto(row), membershipStatus: row.membership_status ?? null,isOperator:Boolean(row.is_operator),applicationCount:Number(row.application_count),withdrawalCount:Number(row.withdrawal_count) }))); } catch (error) { next(error); } });
app.get("/api/parishioner/groups/:id/contents",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.id),type=String(req.query.type??"");if(!["notice","board"].includes(type))return res.status(400).json({message:"올바른 게시판 종류를 선택해 주세요."});const access=await parishionerGroupAccess(res,groupId);if(!access||(!access.isOwner&&!access.isMember))return res.status(403).json({message:"이 모임의 게시물을 볼 권한이 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT c.id,c.title,c.content,c.attachment_name AS attachmentName,c.created_at AS createdAt,COALESCE(c.author_name,p.name,'성당 관리자') AS authorName,p.baptismal_name AS baptismalName FROM parish_group_contents c LEFT JOIN parishioners p ON p.id=c.author_parishioner_id WHERE c.group_id=? AND c.content_type=? ORDER BY c.created_at DESC,c.id DESC",[groupId,type]);res.json({groupName:access.name,isOwner:access.isOwner,items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.get("/api/parishioner/groups/:groupId/contents/:contentId/attachment",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.groupId),contentId=Number(req.params.contentId),access=await parishionerGroupAccess(res,groupId);if(!access||(!access.isOwner&&!access.isMember))return res.status(403).end();const [rows]=await pool.query<RowDataPacket[]>("SELECT attachment_name AS name,attachment_type AS type,attachment_data AS data FROM parish_group_contents WHERE id=? AND group_id=? LIMIT 1",[contentId,groupId]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type||"application/octet-stream"));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});
const groupBoardReactions=new Set(["like","cheer","empathy"]);
app.get("/api/parishioner/groups/:groupId/contents/:contentId/community",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.groupId),contentId=Number(req.params.contentId),userId=await currentParishionerId(res),access=await parishionerGroupAccess(res,groupId);if(!access||(!access.isOwner&&!access.isMember))return res.status(403).json({message:"게시글을 확인할 권한이 없습니다."});const [contents]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_group_contents WHERE id=? AND group_id=? AND content_type='board'",[contentId,groupId]);if(!contents.length)return res.status(404).json({message:"게시글을 찾을 수 없습니다."});const [reactions]=await pool.query<RowDataPacket[]>("SELECT reaction,COUNT(*) AS count,MAX(parishioner_id=?) AS selected FROM parish_group_content_reactions WHERE content_id=? GROUP BY reaction",[userId,contentId]),[comments]=await pool.query<RowDataPacket[]>("SELECT c.id,c.content,c.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM parish_group_content_comments c INNER JOIN parishioners p ON p.id=c.author_id WHERE c.content_id=? ORDER BY c.created_at,c.id",[contentId]);res.json({reactions:reactions.map(row=>({reaction:String(row.reaction),count:Number(row.count),selected:Boolean(row.selected)})),comments:comments.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.put("/api/parishioner/groups/:groupId/contents/:contentId/reaction",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.groupId),contentId=Number(req.params.contentId),reaction=String(req.body.reaction??""),userId=await currentParishionerId(res),access=await parishionerGroupAccess(res,groupId);if(!groupBoardReactions.has(reaction))return res.status(400).json({message:"평가를 확인해 주세요."});if(!access||(!access.isOwner&&!access.isMember))return res.status(403).json({message:"평가할 권한이 없습니다."});const [contents]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_group_contents WHERE id=? AND group_id=? AND content_type='board'",[contentId,groupId]);if(!contents.length)return res.status(404).json({message:"게시글을 찾을 수 없습니다."});const [current]=await pool.query<RowDataPacket[]>("SELECT reaction FROM parish_group_content_reactions WHERE content_id=? AND parishioner_id=?",[contentId,userId]);if(current[0]?.reaction===reaction)await pool.execute("DELETE FROM parish_group_content_reactions WHERE content_id=? AND parishioner_id=?",[contentId,userId]);else await pool.execute("INSERT INTO parish_group_content_reactions (content_id,parishioner_id,reaction) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reaction=VALUES(reaction),created_at=NOW()",[contentId,userId,reaction]);res.json({message:"평가를 반영했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/groups/:groupId/contents/:contentId/comments",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.groupId),contentId=Number(req.params.contentId),content=String(req.body.content??"").trim(),userId=await currentParishionerId(res),access=await parishionerGroupAccess(res,groupId);if(!content||content.length>2000)return res.status(400).json({message:"댓글을 1~2,000자로 입력해 주세요."});if(!access||(!access.isOwner&&!access.isMember))return res.status(403).json({message:"댓글을 작성할 권한이 없습니다."});const [contents]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_group_contents WHERE id=? AND group_id=? AND content_type='board'",[contentId,groupId]);if(!contents.length)return res.status(404).json({message:"게시글을 찾을 수 없습니다."});await pool.execute("INSERT INTO parish_group_content_comments (content_id,author_id,content) VALUES (?,?,?)",[contentId,userId,content]);res.status(201).json({message:"댓글을 등록했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/groups/:id/contents",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.id),type=String(req.body.type??""),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim(),attachmentName=String(req.body.attachmentName??"").trim(),attachmentType=String(req.body.attachmentType??"").trim(),attachmentData=String(req.body.attachmentData??"");if(!["notice","board"].includes(type))return res.status(400).json({message:"올바른 게시판 종류를 선택해 주세요."});if(!title||!content)return res.status(400).json({message:"제목과 내용을 모두 입력해 주세요."});if(title.length>200||content.length>20000)return res.status(400).json({message:"제목은 200자, 내용은 20,000자 이내로 작성해 주세요."});if(attachmentData&&Buffer.byteLength(attachmentData,"base64")>10*1024*1024)return res.status(400).json({message:"첨부파일은 10MB 이하만 업로드할 수 있습니다."});const access=await parishionerGroupAccess(res,groupId);if(!access||(!access.isOwner&&!access.isMember))return res.status(403).json({message:"이 모임에 글을 작성할 권한이 없습니다."});if(type==="notice"&&!access.isOwner)return res.status(403).json({message:"공지사항은 모임 주인만 작성할 수 있습니다."});const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_group_contents (group_id,author_parishioner_id,content_type,title,content,attachment_name,attachment_type,attachment_data) VALUES (?,?,?,?,?,?,?,?)",[groupId,access.userId,type,title,content,attachmentData?attachmentName:null,attachmentData?attachmentType:null,attachmentData?Buffer.from(attachmentData,"base64"):null]),contentId=Number(result.insertId),parishId=Number(res.locals.parishioner.parish_id);const [recipients]=await pool.query<RowDataPacket[]>("SELECT creator_parishioner_id AS id FROM parish_groups WHERE id=? AND creator_parishioner_id IS NOT NULL UNION SELECT parishioner_id AS id FROM parish_group_members WHERE group_id=? AND status='approved'",[groupId,groupId]),notificationTitle=type==="notice"?`${access.name} 새 공지사항`:`${access.name} 새 게시글`,notificationMessage=`${type==="notice"?"공지사항":"게시판"}에 '${title}' 글이 등록되었습니다.`;await Promise.all(recipients.map(row=>Number(row.id)).filter(id=>id&&id!==access.userId).map(id=>pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group_content',?)",[parishId,id,type==="notice"?"group_notice":"group_board",notificationTitle,notificationMessage,contentId])));res.status(201).json({id:contentId,message:type==="notice"?"공지사항을 등록했습니다.":"게시글을 등록했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/groups/:id/join",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),groupId=Number(req.params.id),userKey=String(res.locals.parishioner.user_key),email=userKey.slice(userKey.indexOf(":")+1),message=String(req.body.message??"").trim();if(!message)return res.status(400).json({message:"단체 등록자에게 전달할 메시지를 입력해 주세요."});if(message.length>2000)return res.status(400).json({message:"가입 신청 메시지는 2,000자 이내로 작성해 주세요."});const [groups]=await pool.query<RowDataPacket[]>("SELECT id,name_ko,creator_parishioner_id FROM parish_groups WHERE id=? AND parish_id=? AND status='approved' LIMIT 1",[groupId,parishId]);if(!groups.length)return res.status(400).json({message:"가입 신청 가능한 단체가 아닙니다."});const [people]=await pool.query<RowDataPacket[]>("SELECT id,name FROM parishioners WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]);if(!people.length)return res.status(404).json({message:"신도 정보를 찾을 수 없습니다."});const parishionerId=Number(people[0]!.id),operatorId=Number(groups[0]!.creator_parishioner_id);if(operatorId===parishionerId)return res.status(403).json({message:"자신이 만든 단체에는 가입 신청할 수 없습니다."});const [existing]=await pool.query<RowDataPacket[]>("SELECT id,status FROM parish_group_members WHERE group_id=? AND parishioner_id=?",[groupId,parishionerId]);if(existing.length){const current=String(existing[0]!.status);if(current==="approved")return res.status(409).json({message:"이미 가입된 단체입니다."});if(current==="requested")return res.status(409).json({message:"이미 가입 신청 중인 단체입니다."});if(current==="withdrawal_requested")return res.status(409).json({message:"현재 탈퇴 승인 대기 중인 단체입니다."});await pool.execute("UPDATE parish_group_members SET status='requested',joined_at=NULL,requested_at=NOW(),application_message=?,rejection_reason=NULL,decided_at=NULL,notification_read_at=NULL,withdrawal_requested_at=NULL,withdrawal_request_reason=NULL,withdrawal_reason=NULL WHERE id=?",[message,existing[0]!.id])}else await pool.execute("INSERT INTO parish_group_members (group_id,parishioner_id,status,joined_at,application_message) VALUES (?,?,'requested',NULL,?)",[groupId,parishionerId,message]);const notificationMessage=`${people[0]!.name} 신도가 '${groups[0]!.name_ko}' 모임 가입을 요청했습니다.`;if(operatorId)await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group',?)",[parishId,operatorId,"group_join_request","모임 가입 신청",notificationMessage,groupId]);await pool.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'group_join_request','단체 가입 요청',?,'group',?)",[parishId,notificationMessage,groupId]);res.status(201).json({message:existing.length?"단체 재가입 신청이 완료되었습니다.":"메시지와 함께 단체 가입 신청이 완료되었습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/groups/:id/withdraw",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),groupId=Number(req.params.id),reason=String(req.body.reason??"").trim();if(!reason)return res.status(400).json({message:"탈퇴 요청 사유를 입력해 주세요."});if(reason.length>2000)return res.status(400).json({message:"탈퇴 요청 사유는 2,000자 이내로 작성해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT g.name_ko,p.name FROM parish_groups g INNER JOIN parishioners p ON p.id=? WHERE g.id=? AND g.parish_id=?",[userId,groupId,parishId]);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id SET gm.status='withdrawal_requested',gm.withdrawal_requested_at=NOW(),gm.withdrawal_request_reason=?,gm.withdrawal_reason=NULL WHERE gm.group_id=? AND gm.parishioner_id=? AND gm.status='approved' AND g.parish_id=?",[reason,groupId,userId,parishId]);if(!result.affectedRows)return res.status(409).json({message:"탈퇴 요청할 수 있는 가입 단체가 아닙니다."});if(targets[0])await pool.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'group_withdrawal_request','단체 탈퇴 요청',?,'group',?)",[parishId,`${targets[0].name} 신도가 '${targets[0].name_ko}' 단체 탈퇴를 요청했습니다.`,groupId]);res.json({message:"탈퇴 사유와 함께 단체 등록자에게 요청을 전달했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/groups/:id/applications",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),groupId=Number(req.params.id);const [groups]=await pool.query<RowDataPacket[]>("SELECT id,name_ko FROM parish_groups WHERE id=? AND parish_id=? AND creator_parishioner_id=?",[groupId,parishId,userId]);if(!groups.length)return res.status(403).json({message:"가입 신청을 관리할 권한이 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT gm.id,p.name,p.baptismal_name AS baptismalName,p.email,p.mobile,gm.application_message AS applicationMessage,gm.requested_at AS requestedAt FROM parish_group_members gm INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE gm.group_id=? AND gm.status='requested' ORDER BY gm.requested_at",[groupId]);res.json({group:groups[0],items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.get("/api/parishioner/groups/:id/members",requireParishioner,async(req,res,next)=>{try{const groupId=Number(req.params.id),access=await parishionerGroupAccess(res,groupId);if(!access||(!access.isOwner&&!access.isMember))return res.status(403).json({message:"회원 명단을 확인할 권한이 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT p.name,p.baptismal_name AS baptismalName FROM parish_group_members gm INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE gm.group_id=? AND gm.status='approved' UNION SELECT p.name,p.baptismal_name AS baptismalName FROM parish_groups g INNER JOIN parishioners p ON p.id=g.creator_parishioner_id WHERE g.id=? ORDER BY name",[groupId,groupId]);res.json({items:rows.map(row=>({name:String(row.name),baptismalName:row.baptismalName?String(row.baptismalName):null}))})}catch(error){next(error)}});
app.patch("/api/parishioner/groups/:groupId/applications/:id",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),groupId=Number(req.params.groupId),membershipId=Number(req.params.id),decision=String(req.body.decision??""),reason=String(req.body.reason??"").trim();if(!["approved","rejected"].includes(decision))return res.status(400).json({message:"승인 또는 반려를 선택해 주세요."});if(decision==="rejected"&&!reason)return res.status(400).json({message:"반려 사유를 입력해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT gm.parishioner_id,g.name_ko FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id WHERE gm.id=? AND gm.group_id=? AND gm.status='requested' AND g.parish_id=? AND g.creator_parishioner_id=?",[membershipId,groupId,parishId,userId]);if(!targets.length)return res.status(404).json({message:"처리할 가입 신청을 찾을 수 없습니다."});const target=targets[0]!;await pool.execute("UPDATE parish_group_members SET status=?,joined_at=IF(?='approved',NOW(),NULL),rejection_reason=?,decided_at=NOW(),notification_read_at=NULL WHERE id=?",[decision,decision,decision==="rejected"?reason:null,membershipId]);await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group',?)",[parishId,target.parishioner_id,"group_membership_decision","모임 가입 결과",decision==="approved"?`'${target.name_ko}' 가입이 승인되었습니다.`:`'${target.name_ko}' 가입이 반려되었습니다. 사유: ${reason}`,groupId]);res.json({message:decision==="approved"?"가입을 승인했습니다.":"가입 신청을 반려했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/groups/:id/withdrawals",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),groupId=Number(req.params.id);const [groups]=await pool.query<RowDataPacket[]>("SELECT id,name_ko FROM parish_groups WHERE id=? AND parish_id=? AND creator_parishioner_id=?",[groupId,parishId,userId]);if(!groups.length)return res.status(403).json({message:"탈퇴 요청을 관리할 권한이 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT gm.id,p.name,p.baptismal_name AS baptismalName,p.email,p.mobile,gm.withdrawal_request_reason AS requestReason,gm.withdrawal_requested_at AS requestedAt FROM parish_group_members gm INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE gm.group_id=? AND gm.status='withdrawal_requested' ORDER BY gm.withdrawal_requested_at",[groupId]);res.json({group:groups[0],items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.patch("/api/parishioner/groups/:groupId/withdrawals/:id",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res),groupId=Number(req.params.groupId),membershipId=Number(req.params.id),decision=String(req.body.decision??""),reason=String(req.body.reason??"").trim();if(decision!=="approved"&&decision!=="rejected")return res.status(400).json({message:"승인 또는 반려를 선택해 주세요."});if(decision==="rejected"&&!reason)return res.status(400).json({message:"탈퇴 반려 사유를 입력해 주세요."});if(reason.length>1000)return res.status(400).json({message:"반려 사유는 1,000자 이내로 작성해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT gm.parishioner_id,g.name_ko FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id WHERE gm.id=? AND gm.group_id=? AND gm.status='withdrawal_requested' AND g.parish_id=? AND g.creator_parishioner_id=?",[membershipId,groupId,parishId,userId]);if(!targets.length)return res.status(404).json({message:"처리할 탈퇴 요청을 찾을 수 없습니다."});const target=targets[0]!;await pool.execute("UPDATE parish_group_members SET status=?,joined_at=IF(?='approved',NULL,joined_at),withdrawal_reason=?,decided_at=NOW() WHERE id=?",[decision==="approved"?"withdrawn":"approved",decision,decision==="rejected"?reason:null,membershipId]);await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group',?)",[parishId,target.parishioner_id,"group_withdrawal_decision","단체 탈퇴 결과",decision==="approved"?`'${target.name_ko}' 단체 탈퇴가 승인되었습니다.`:`'${target.name_ko}' 단체 탈퇴 요청이 반려되었습니다. 사유: ${reason}`,groupId]);res.json({message:decision==="approved"?"단체 탈퇴를 승인했습니다.":"단체 탈퇴 요청을 반려했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/group-membership-results",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userKey=String(res.locals.parishioner.user_key),email=userKey.slice(userKey.indexOf(":")+1);const [rows]=await pool.query<RowDataPacket[]>("SELECT gm.id,g.name_ko AS groupName,gm.status,gm.rejection_reason AS rejectionReason,gm.requested_at AS requestedAt,gm.decided_at AS decidedAt,gm.notification_read_at AS readAt FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE g.parish_id=? AND p.email=? AND gm.status IN ('approved','rejected') ORDER BY gm.decided_at DESC",[parishId,email]);res.json(rows.map(row=>({...row,id:Number(row.id),unread:!row.readAt}))) }catch(error){next(error)}});
app.post("/api/parishioner/group-membership-results/:id/read",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userKey=String(res.locals.parishioner.user_key),email=userKey.slice(userKey.indexOf(":")+1);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id INNER JOIN parishioners p ON p.id=gm.parishioner_id SET gm.notification_read_at=NOW() WHERE gm.id=? AND g.parish_id=? AND p.email=?",[Number(req.params.id),parishId,email]);if(!result.affectedRows)return res.status(404).json({message:"알림을 찾을 수 없습니다."});res.json({message:"알림을 확인했습니다."})}catch(error){next(error)}});
app.get("/api/parishioner/notifications",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT id,category,title,message,reference_type AS referenceType,reference_id AS referenceId,read_at AS readAt,created_at AS createdAt FROM parishioner_notifications WHERE parish_id=? AND parishioner_id=? ORDER BY created_at DESC,id DESC LIMIT 100",[parishId,userId]);res.json(rows.map(row=>({...row,id:Number(row.id),referenceId:row.referenceId==null?null:Number(row.referenceId),unread:!row.readAt})))}catch(error){next(error)}});
app.post("/api/parishioner/notifications/:id/read",requireParishioner,async(req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parishioner_notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND parish_id=? AND parishioner_id=?",[Number(req.params.id),parishId,userId]);if(!result.affectedRows)return res.status(404).json({message:"알림을 찾을 수 없습니다."});res.json({message:"알림을 확인했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner/groups",requireParishioner,async(req,res,next)=>{try{const value=groupPayload(req.body),errors=groupErrors(value);if(Object.keys(errors).length)return res.status(400).json({message:"입력 내용을 확인해 주세요.",errors});const parishId=Number(res.locals.parishioner.parish_id),userKey=String(res.locals.parishioner.user_key),email=userKey.slice(userKey.indexOf(":")+1);const [people]=await pool.query<RowDataPacket[]>("SELECT id,name FROM parishioners WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]);if(!people.length)return res.status(404).json({message:"신도 정보를 찾을 수 없습니다."});const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_groups (parish_id,icon_type,icon_data,name_ko,name_en,description,regular_meeting,creator_type,creator_parishioner_id,operator_name,status) VALUES (?,?,?,?,?,?,?,'parishioner',?,?,'requested')",[parishId,value.iconType||null,value.iconData?Buffer.from(value.iconData,"base64"):null,value.nameKo,value.nameEn||null,value.description||null,value.regularMeeting||null,people[0]!.id,people[0]!.name]);await pool.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'group_approval_request','단체 승인 요청',?,'group',?)",[parishId,`${people[0]!.name} 신도가 '${value.nameKo}' 단체 승인을 요청했습니다.`,result.insertId]);res.status(201).json({message:"단체 승인 신청이 등록되었습니다.",id:result.insertId})}catch(error){next(error)}});
app.get("/api/parishioner/groups/:id/icon",requireParishioner,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT icon_type,icon_data FROM parish_groups WHERE id=? AND parish_id=? LIMIT 1",[Number(req.params.id),Number(res.locals.parishioner.parish_id)]);if(!rows.length||!rows[0]!.icon_data)return res.status(404).end();res.type(String(rows[0]!.icon_type));res.send(rows[0]!.icon_data)}catch(error){next(error)}});
app.get("/api/parishioner/notices",requireParishioner,async(_req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT id,title,content,pinned,popup_enabled,popup_from,popup_to,attachment1_name,attachment1_type,attachment2_name,attachment2_type,created_at,updated_at FROM parish_notices WHERE parish_id=? ORDER BY pinned DESC,created_at DESC,id DESC",[Number(res.locals.parishioner.parish_id)]);res.json(rows.map(noticeDto))}catch(error){next(error)}});
app.get("/api/parishioner/notices/popups/active",requireParishioner,async(_req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT id,title,content,pinned,popup_enabled,popup_from,popup_to,attachment1_name,attachment1_type,attachment2_name,attachment2_type,created_at,updated_at FROM parish_notices WHERE parish_id=? AND popup_enabled=1 AND CURDATE() BETWEEN popup_from AND popup_to ORDER BY pinned DESC,created_at DESC,id DESC",[Number(res.locals.parishioner.parish_id)]);res.json(rows.map(noticeDto))}catch(error){next(error)}});
app.get("/api/parishioner/notices/:id/attachments/:slot",requireParishioner,async(req,res,next)=>{try{const slot=Number(req.params.slot);if(slot!==1&&slot!==2)return res.status(400).end();const [rows]=await pool.query<RowDataPacket[]>(`SELECT attachment${slot}_name AS name,attachment${slot}_type AS type,attachment${slot}_data AS data FROM parish_notices WHERE id=? AND parish_id=? LIMIT 1`,[Number(req.params.id),Number(res.locals.parishioner.parish_id)]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type||"application/octet-stream"));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});
app.get("/api/parishioner/memorials",requireParishioner,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>(`SELECT m.id,m.name,m.baptismal_name AS baptismalName,m.history_text AS historyText,m.ordination_text AS ordinationText,DATE_FORMAT(m.death_date,'%Y-%m-%d') AS deathDate,m.biography,m.status,m.rejection_reason AS rejectionReason,m.author_id AS authorId,m.created_at AS createdAt,(SELECT id FROM memorial_photos WHERE memorial_id=m.id ORDER BY display_order,id LIMIT 1) AS coverPhotoId,(SELECT COUNT(*) FROM memorial_photos WHERE memorial_id=m.id) AS photoCount,(SELECT COUNT(*) FROM memorial_entries WHERE memorial_id=m.id AND entry_type='message') AS messageCount,(SELECT COUNT(*) FROM memorial_entries WHERE memorial_id=m.id AND entry_type='prayer') AS prayerCount FROM memorials m WHERE m.parish_id=? AND (m.status='approved' OR m.author_id=?) ORDER BY m.status='approved' DESC,m.created_at DESC`,[parishId,userId]);res.json(rows.map(row=>({...row,id:Number(row.id),authorId:Number(row.authorId),coverPhotoId:row.coverPhotoId?Number(row.coverPhotoId):null,photoCount:Number(row.photoCount),messageCount:Number(row.messageCount),prayerCount:Number(row.prayerCount)})))}catch(error){next(error)}});
app.post("/api/parishioner/memorials",requireParishioner,async(req,res,next)=>{const parishId=Number(res.locals.parishioner.parish_id),authorId=await currentParishionerId(res),name=String(req.body.name??"").trim(),baptismalName=String(req.body.baptismalName??"").trim(),relationType=String(req.body.relationType??"").trim(),relationDetail=String(req.body.relationDetail??"").trim(),historyText=String(req.body.historyText??"").trim(),ordinationText=String(req.body.ordinationText??"").trim(),deathDate=String(req.body.deathDate??""),biography=String(req.body.biography??"").trim(),photos=Array.isArray(req.body.photos)?req.body.photos:[];if(!name||!["family","friend","priest","other"].includes(relationType)||!relationDetail||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(deathDate)||!biography)return res.status(400).json({message:"이름, 나와의 관계, 선종일, 약력을 입력해 주세요."});if(name.length>100||baptismalName.length>100||relationDetail.length>100||historyText.length>20000||ordinationText.length>300||biography.length>20000||photos.length<1||photos.length>5)return res.status(400).json({message:"입력 길이와 사진 수(1~5장)를 확인해 주세요."});const decoded:{type:string;data:Buffer}[]=photos.map((photo:any)=>({type:String(photo.type??""),data:Buffer.from(String(photo.data??""),"base64")}));if(decoded.some(photo=>!/^image\/(jpeg|png|webp)$/i.test(photo.type)||!photo.data.length||photo.data.length>2*1024*1024))return res.status(400).json({message:"사진은 JPG, PNG, WEBP 형식의 장당 2MB 이하만 등록할 수 있습니다."});const connection=await pool.getConnection();try{await connection.beginTransaction();const [result]=await connection.execute<mysql.ResultSetHeader>("INSERT INTO memorials (parish_id,author_id,name,baptismal_name,relation_type,relation_detail,history_text,ordination_text,death_date,biography) VALUES (?,?,?,?,?,?,?,?,?,?)",[parishId,authorId,name,baptismalName||null,relationType,relationDetail,historyText||null,ordinationText||null,deathDate,biography]);for(let i=0;i<decoded.length;i++)await connection.execute("INSERT INTO memorial_photos (memorial_id,image_type,image_data,display_order) VALUES (?,?,?,?)",[result.insertId,decoded[i]!.type,decoded[i]!.data,i]);await connection.execute("INSERT INTO parish_notifications (parish_id,category,title,message,reference_type,reference_id) VALUES (?,'memorial_approval_request','추모 공간 승인 요청',?,'memorial',?)",[parishId,`'${name}' 추모 공간 등록 요청이 도착했습니다.`,result.insertId]);await connection.commit();res.status(201).json({message:"추모 공간 등록을 요청했습니다. 승인 후 공개됩니다."})}catch(error){await connection.rollback();next(error)}finally{connection.release()}});
app.get("/api/parishioner/memorials/:id",requireParishioner,async(req,res,next)=>{try{const id=Number(req.params.id),parishId=Number(res.locals.parishioner.parish_id),userId=await currentParishionerId(res);const [rows]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,history_text AS historyText,ordination_text AS ordinationText,DATE_FORMAT(death_date,'%Y-%m-%d') AS deathDate,biography,status FROM memorials WHERE id=? AND parish_id=? AND (status='approved' OR author_id=?) LIMIT 1",[id,parishId,userId]);if(!rows.length)return res.status(404).json({message:"추모 공간을 찾을 수 없습니다."});const [photos]=await pool.query<RowDataPacket[]>("SELECT id FROM memorial_photos WHERE memorial_id=? ORDER BY display_order,id",[id]),[entries]=await pool.query<RowDataPacket[]>("SELECT e.id,e.entry_type AS entryType,e.content,e.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM memorial_entries e JOIN parishioners p ON p.id=e.author_id WHERE e.memorial_id=? ORDER BY e.created_at,e.id",[id]);res.json({...rows[0],id,photos:photos.map(row=>({id:Number(row.id),url:`/api/parishioner/memorial-photos/${row.id}`})),entries})}catch(error){next(error)}});
app.get("/api/parishioner/memorial-photos/:id",requireParishioner,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT p.image_type,p.image_data FROM memorial_photos p JOIN memorials m ON m.id=p.memorial_id WHERE p.id=? AND m.parish_id=? AND m.status='approved' LIMIT 1",[Number(req.params.id),Number(res.locals.parishioner.parish_id)]);if(!rows.length)return res.status(404).end();res.type(String(rows[0]!.image_type));res.send(rows[0]!.image_data)}catch(error){next(error)}});
app.post("/api/parishioner/memorials/:id/entries",requireParishioner,async(req,res,next)=>{try{const id=Number(req.params.id),parishId=Number(res.locals.parishioner.parish_id),authorId=await currentParishionerId(res),entryType=String(req.body.entryType??""),content=String(req.body.content??"").trim();if(!["message","prayer"].includes(entryType)||!content||content.length>3000)return res.status(400).json({message:"추모 메시지 또는 기도문을 3,000자 이내로 입력해 주세요."});const [rows]=await pool.query<RowDataPacket[]>("SELECT id FROM memorials WHERE id=? AND parish_id=? AND status='approved'",[id,parishId]);if(!rows.length)return res.status(404).json({message:"공개된 추모 공간을 찾을 수 없습니다."});await pool.execute("INSERT INTO memorial_entries (memorial_id,author_id,entry_type,content) VALUES (?,?,?,?)",[id,authorId,entryType,content]);res.status(201).json({message:entryType==="prayer"?"기도문을 남겼습니다.":"추모 메시지를 남겼습니다."})}catch(error){next(error)}});
app.get("/api/parish/memorials",requireParish,async(_req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>(`SELECT m.id,m.name,m.baptismal_name AS baptismalName,DATE_FORMAT(m.death_date,'%Y-%m-%d') AS deathDate,m.status,m.rejection_reason AS rejectionReason,m.created_at AS createdAt,p.name AS authorName FROM memorials m JOIN parishioners p ON p.id=m.author_id WHERE m.parish_id=? ORDER BY FIELD(m.status,'requested','approved','rejected'),m.created_at DESC`,[Number(res.locals.parishSession.parish_id)]);res.json(rows)}catch(error){next(error)}});
app.get("/api/parish/memorials/:id",requireParish,async(req,res,next)=>{try{const id=Number(req.params.id),parishId=Number(res.locals.parishSession.parish_id);const [rows]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName,history_text AS historyText,ordination_text AS ordinationText,DATE_FORMAT(death_date,'%Y-%m-%d') AS deathDate,biography,status,rejection_reason AS rejectionReason FROM memorials WHERE id=? AND parish_id=? LIMIT 1",[id,parishId]);if(!rows.length)return res.status(404).json({message:"추모 공간을 찾을 수 없습니다."});const [photos]=await pool.query<RowDataPacket[]>("SELECT id FROM memorial_photos WHERE memorial_id=? ORDER BY display_order,id",[id]);res.json({...rows[0],photos:photos.map(row=>({id:Number(row.id),url:`/api/parish/memorial-photos/${row.id}`}))})}catch(error){next(error)}});
app.get("/api/parish/memorial-photos/:id",requireParish,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT p.image_type,p.image_data FROM memorial_photos p JOIN memorials m ON m.id=p.memorial_id WHERE p.id=? AND m.parish_id=? LIMIT 1",[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!rows.length)return res.status(404).end();res.type(String(rows[0]!.image_type));res.send(rows[0]!.image_data)}catch(error){next(error)}});
app.patch("/api/parish/memorials/:id/status",requireParish,async(req,res,next)=>{try{const status=String(req.body.status??""),reason=String(req.body.reason??"").trim(),id=Number(req.params.id),parishId=Number(res.locals.parishSession.parish_id);if(!["approved","rejected"].includes(status)||status==="rejected"&&!reason)return res.status(400).json({message:"승인 또는 반려 사유를 확인해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE memorials SET status=?,rejection_reason=?,decided_at=NOW() WHERE id=? AND parish_id=? AND status='requested'",[status,status==="rejected"?reason:null,id,parishId]);if(!result.affectedRows)return res.status(404).json({message:"처리할 추모 공간 요청이 없습니다."});res.json({message:status==="approved"?"추모 공간을 승인했습니다.":"추모 공간 요청을 반려했습니다."})}catch(error){next(error)}});
app.post("/api/parishioner-auth/logout",requireParishioner,async(_req,res,next)=>{try{await pool.execute("UPDATE login_sessions SET logged_out_at=NOW(),logout_reason='manual' WHERE id=? AND logged_out_at IS NULL",[res.locals.parishioner.id]);res.setHeader("Set-Cookie",sessionCookie("parishioner_session","",0));res.json({message:"로그아웃되었습니다."})}catch(error){next(error)}});

app.post("/api/parish-auth/code", async (req, res, next) => {
  try {
    const parishId = Number(req.body.parishId);
    const email = normalizeEmail(req.body.email);
    if (!Number.isSafeInteger(parishId) || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "성당과 올바른 이메일을 입력해 주세요." });
    }
    const [admins] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM parish_admins WHERE parish_id = ? AND email = ? LIMIT 1",
      [parishId, email],
    );
    if (!admins.length) return res.status(403).json({ message: "등록된 성당 관리자 정보를 확인해 주세요." });

    const code = crypto.randomInt(100000, 1000000).toString();
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    await pool.execute(
      "INSERT INTO parish_login_codes (parish_id, email, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE))",
      [parishId, email, hash],
    );

    let devCode: string | undefined;
    if (process.env.EMAIL_DELIVERY_MODE === "mock") {
      devCode = code;
    } else if (process.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS } : undefined,
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "[Paxlink] 성당 관리자 로그인 인증코드",
        text: `인증코드는 ${code}입니다. 3분 이내 입력해 주세요.`,
        html: verificationEmailHtml(code, "성당 관리자 로그인"),
      });
    } else if (process.env.NODE_ENV !== "production") {
      devCode = code;
    } else {
      return res.status(503).json({ message: "이메일 발송 설정이 필요합니다." });
    }
    res.json({ message: devCode ? "가상 인증번호를 발급했습니다." : "인증코드를 발송했습니다.", devCode });
  } catch (error) { next(error); }
});

app.post("/api/parish-auth/verify", async (req, res, next) => {
  try {
    const parishId = Number(req.body.parishId);
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code ?? "").trim();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code_hash, expires_at, attempts FROM parish_login_codes
       WHERE parish_id = ? AND email = ? AND used_at IS NULL
       AND expires_at > NOW() AND attempts < 5
       ORDER BY id DESC LIMIT 1`, [parishId, email],
    );
    const record = rows[0];
    if (!record) {
      return res.status(400).json({ message: "인증코드가 만료되었습니다. 다시 요청해 주세요." });
    }
    const actual = crypto.createHash("sha256").update(code).digest("hex");
    const valid = crypto.timingSafeEqual(Buffer.from(record.code_hash), Buffer.from(actual));
    if (!valid) {
      await pool.execute("UPDATE parish_login_codes SET attempts = attempts + 1 WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "인증코드가 올바르지 않습니다." });
    }
    await pool.execute("UPDATE parish_login_codes SET used_at = NOW() WHERE id = ?", [record.id]);
    const session = await openSession(req, "parish", `${parishId}:${email}`, parishId);
    res.setHeader("Set-Cookie", sessionCookie("parish_session", session.token));
    res.json({ message: "로그인되었습니다.", previousSession: session.previous });
  } catch (error) { next(error); }
});

async function requireParish(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const token = parseCookies(req.headers.cookie).parish_session;
    if (!token) return res.status(401).json({ message: "로그인이 필요합니다." });
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_key, parish_id FROM login_sessions WHERE token_hash = ? AND user_type = 'parish'
       AND logged_out_at IS NULL AND expires_at > NOW() LIMIT 1`, [tokenHash(token)],
    );
    if (!rows.length) return res.status(401).json({ message: "세션이 만료되었습니다. 다시 로그인해 주세요." });
    await pool.execute("UPDATE login_sessions SET last_seen_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?", [rows[0]!.id]);
    res.setHeader("Set-Cookie", sessionCookie("parish_session", token));
    res.locals.parishSession = rows[0];
    next();
  } catch (error) { next(error); }
}

app.get("/api/parish-auth/me", requireParish, (_req, res) => {
  const userKey = String(res.locals.parishSession.user_key);
  res.json({ authenticated: true, parishId: res.locals.parishSession.parish_id, email: userKey.slice(userKey.indexOf(":") + 1) });
});
app.get("/api/parish/catacomb/posts",requireParish,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id);const [rows]=await pool.query<RowDataPacket[]>("SELECT c.id,c.title,c.content,c.tags,c.anonymous,c.status,c.rejection_reason AS rejectionReason,c.created_at AS createdAt,c.decided_at AS decidedAt,p.name AS authorName,p.baptismal_name AS baptismalName FROM catacomb_posts c INNER JOIN parishioners p ON p.id=c.author_id WHERE c.parish_id=? ORDER BY FIELD(c.status,'requested','approved','rejected'),c.created_at DESC,c.id DESC",[parishId]);res.json(rows.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous),tags:String(row.tags||'').split(',').filter(Boolean)})))}catch(error){next(error)}});
app.patch("/api/parish/catacomb/posts/:id/decision",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),postId=Number(req.params.id),status=String(req.body.status??""),reason=String(req.body.rejectionReason??"").trim();if(!["approved","rejected"].includes(status))return res.status(400).json({message:"승인 또는 반려를 선택해 주세요."});if(status==="rejected"&&!reason)return res.status(400).json({message:"반려 사유를 입력해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT author_id,title FROM catacomb_posts WHERE id=? AND parish_id=? AND status='requested'",[postId,parishId]);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE catacomb_posts SET status=?,rejection_reason=?,decided_at=NOW() WHERE id=? AND parish_id=? AND status='requested'",[status,status==="rejected"?reason:null,postId,parishId]);if(!result.affectedRows)return res.status(404).json({message:"처리할 카타콤 등록 요청을 찾을 수 없습니다."});if(targets[0])await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'catacomb',?)",[parishId,targets[0].author_id,"catacomb_decision","카타콤 등록 결과",status==="approved"?`'${targets[0].title}' 카타콤이 승인되었습니다.`:`'${targets[0].title}' 카타콤이 반려되었습니다. 사유: ${reason}`,postId]);res.json({message:status==="approved"?"카타콤을 승인했습니다.":"카타콤을 반려했습니다."})}catch(error){next(error)}});
app.get("/api/parish/missions",requireParish,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id);const [rows]=await pool.query<RowDataPacket[]>(`SELECT m.id,m.title,m.content,m.tags,m.anonymous,m.author_type AS authorType,m.status,m.rejection_reason AS rejectionReason,DATE_FORMAT(m.application_from,'%Y-%m-%d') AS applicationFrom,DATE_FORMAT(m.application_to,'%Y-%m-%d') AS applicationTo,(CURDATE() BETWEEN m.application_from AND m.application_to) AS applicationOpen,m.created_at AS createdAt,m.decided_at AS decidedAt,COALESCE(m.author_name,p.name) AS authorName,p.baptismal_name AS baptismalName,(SELECT COUNT(*) FROM sharing_mission_applications a WHERE a.mission_id=m.id) AS applicationCount,(SELECT COUNT(*) FROM sharing_mission_applications a WHERE a.mission_id=m.id AND a.status='approved') AS approvedApplicationCount,(SELECT COUNT(*) FROM sharing_mission_applications a WHERE a.mission_id=m.id AND a.status='rejected') AS rejectedApplicationCount FROM sharing_missions m LEFT JOIN parishioners p ON p.id=m.author_id WHERE m.parish_id=? ORDER BY FIELD(m.status,'requested','approved','rejected'),m.created_at DESC`,[parishId]);res.json(rows.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous),applicationOpen:Boolean(row.applicationOpen),applicationCount:Number(row.applicationCount),approvedApplicationCount:Number(row.approvedApplicationCount),rejectedApplicationCount:Number(row.rejectedApplicationCount),tags:String(row.tags||'').split(',').filter(Boolean)})))}catch(error){next(error)}});
app.post("/api/parish/missions",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim(),applicationFrom=String(req.body.applicationFrom??""),applicationTo=String(req.body.applicationTo??""),tags=[...new Set(String(req.body.tags??"").split(/[,\s]+/).map(value=>value.replace(/^#/,"").trim()).filter(Boolean))].slice(0,20);if(!title||!content)return res.status(400).json({message:"제목과 내용을 입력해 주세요."});if(!/^\d{4}-\d{2}-\d{2}$/.test(applicationFrom)||!/^\d{4}-\d{2}-\d{2}$/.test(applicationTo)||applicationFrom>applicationTo)return res.status(400).json({message:"달란트 모집 기간을 확인해 주세요."});if(title.length>200||content.length>20000||tags.some(tag=>tag.length>30))return res.status(400).json({message:"입력 가능한 글자 수를 확인해 주세요."});const [parishes]=await pool.query<RowDataPacket[]>("SELECT name FROM parishes WHERE id=? LIMIT 1",[parishId]);if(!parishes.length)return res.status(404).json({message:"성당 정보를 찾을 수 없습니다."});const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO sharing_missions (parish_id,author_id,author_type,author_name,title,content,tags,anonymous,application_from,application_to,status,decided_at) VALUES (?,NULL,'parish',?,?,?,?,0,?,?,'approved',NOW())",[parishId,parishes[0]!.name,title,content,tags.join(','),applicationFrom,applicationTo]);res.status(201).json({message:"미션이 등록되어 즉시 승인·공개되었습니다.",id:result.insertId})}catch(error){next(error)}});
app.get("/api/parish/notifications",requireParish,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id);const [rows]=await pool.query<RowDataPacket[]>("SELECT id,category,title,message,reference_type AS referenceType,reference_id AS referenceId,read_at AS readAt,created_at AS createdAt FROM parish_notifications WHERE parish_id=? ORDER BY created_at DESC,id DESC LIMIT 100",[parishId]);res.json(rows.map(row=>({...row,id:Number(row.id),referenceId:row.referenceId==null?null:Number(row.referenceId),unread:!row.readAt})))}catch(error){next(error)}});
app.post("/api/parish/notifications/:id/read",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND parish_id=?",[Number(req.params.id),parishId]);if(!result.affectedRows)return res.status(404).json({message:"알림을 찾을 수 없습니다."});res.json({message:"알림을 확인했습니다."})}catch(error){next(error)}});
app.get("/api/parish/missions/:id/applicants",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),missionId=Number(req.params.id);const [missions]=await pool.query<RowDataPacket[]>("SELECT id,title,author_type FROM sharing_missions WHERE id=? AND parish_id=?",[missionId,parishId]);if(!missions.length)return res.status(404).json({message:"미션을 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT a.id,p.name,p.baptismal_name AS baptismalName,p.mobile,p.email,a.message,a.status,a.rejection_reason AS rejectionReason,DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i') AS appliedAt,CASE WHEN a.status='approved' THEN DATE_FORMAT(a.decided_at,'%Y-%m-%d %H:%i') ELSE NULL END AS approvedAt FROM sharing_mission_applications a INNER JOIN parishioners p ON p.id=a.parishioner_id WHERE a.mission_id=? AND p.parish_id=? ORDER BY FIELD(a.status,'requested','approved','rejected'),a.created_at DESC",[missionId,parishId]);res.json({mission:{id:missionId,title:missions[0]!.title,authorType:missions[0]!.author_type},items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.patch("/api/parish/mission-applications/:id/decision",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),applicationId=Number(req.params.id),status=String(req.body.status??""),rejectionReason=String(req.body.rejectionReason??"").trim();if(status!=="approved"&&status!=="rejected")return res.status(400).json({message:"승낙 또는 반려를 선택해 주세요."});if(status==="rejected"&&!rejectionReason)return res.status(400).json({message:"반려 사유를 입력해 주세요."});if(rejectionReason.length>1000)return res.status(400).json({message:"반려 사유는 1,000자 이내로 입력해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT a.parishioner_id,m.id AS mission_id,m.title FROM sharing_mission_applications a INNER JOIN sharing_missions m ON m.id=a.mission_id WHERE a.id=? AND m.parish_id=? AND m.author_type='parish' AND a.status='requested'",[applicationId,parishId]);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE sharing_mission_applications a INNER JOIN sharing_missions m ON m.id=a.mission_id SET a.status=?,a.rejection_reason=?,a.decided_at=NOW() WHERE a.id=? AND m.parish_id=? AND m.author_type='parish' AND a.status='requested'",[status,status==="rejected"?rejectionReason:null,applicationId,parishId]);if(!result.affectedRows)return res.status(404).json({message:"성당이 처리할 지원 요청을 찾을 수 없습니다."});if(targets[0])await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'mission',?)",[parishId,targets[0].parishioner_id,"mission_application_decision","미션 지원 결과",status==="approved"?`'${targets[0].title}' 미션 지원이 승인되었습니다.`:`'${targets[0].title}' 미션 지원이 반려되었습니다. 사유: ${rejectionReason}`,targets[0].mission_id]);res.json({message:status==="approved"?"미션 지원을 승낙했습니다.":"미션 지원을 반려했습니다."})}catch(error){next(error)}});
app.get("/api/parish/missions/:id/questions",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),missionId=Number(req.params.id);const [missions]=await pool.query<RowDataPacket[]>("SELECT id,title,author_type FROM sharing_missions WHERE id=? AND parish_id=?",[missionId,parishId]);if(!missions.length)return res.status(404).json({message:"미션을 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT q.id,q.question,q.anonymous,q.answer,q.created_at AS createdAt,q.answered_at AS answeredAt,IF(q.anonymous=1,'익명',p.name) AS askerName,IF(q.anonymous=1,NULL,p.baptismal_name) AS baptismalName FROM sharing_mission_questions q INNER JOIN parishioners p ON p.id=q.asker_id WHERE q.mission_id=? ORDER BY q.created_at DESC",[missionId]);res.json({mission:{...missions[0],id:missionId},items:rows.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous)}))})}catch(error){next(error)}});
app.patch("/api/parish/mission-questions/:id/answer",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),questionId=Number(req.params.id),answer=String(req.body.answer??'').trim();if(!answer||answer.length>5000)return res.status(400).json({message:"답변을 5,000자 이하로 입력해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE sharing_mission_questions q INNER JOIN sharing_missions m ON m.id=q.mission_id SET q.answer=?,q.answered_at=NOW() WHERE q.id=? AND m.parish_id=? AND m.author_type='parish'",[answer,questionId,parishId]);if(!result.affectedRows)return res.status(403).json({message:"성당이 등록한 미션에만 답변할 수 있습니다."});res.json({message:"답변을 등록했습니다."})}catch(error){next(error)}});
app.patch("/api/parish/missions/:id/decision",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),missionId=Number(req.params.id),status=String(req.body.status??""),reason=String(req.body.rejectionReason??"").trim();if(status!=="approved"&&status!=="rejected")return res.status(400).json({message:"승인 또는 반려를 선택해 주세요."});if(status==="rejected"&&!reason)return res.status(400).json({message:"반려 사유를 입력해 주세요."});if(reason.length>1000)return res.status(400).json({message:"반려 사유는 1,000자 이하로 입력해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT author_id,title FROM sharing_missions WHERE id=? AND parish_id=? AND status='requested'",[missionId,parishId]);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE sharing_missions SET status=?,rejection_reason=?,decided_at=NOW() WHERE id=? AND parish_id=? AND status='requested'",[status,status==="rejected"?reason:null,missionId,parishId]);if(!result.affectedRows)return res.status(404).json({message:"처리할 승인 요청을 찾을 수 없습니다."});if(targets[0]?.author_id)await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'mission',?)",[parishId,targets[0].author_id,"mission_decision","미션 승인 결과",status==="approved"?`'${targets[0].title}' 미션이 승인되었습니다.`:`'${targets[0].title}' 미션이 반려되었습니다. 사유: ${reason}`,missionId]);res.json({message:status==="approved"?"미션을 승인했습니다.":"미션을 반려하고 작성자에게 사유를 알렸습니다."})}catch(error){next(error)}});
app.get("/api/parish/parishioners", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id); const q = String(req.query.q ?? "").trim(); const like = `%${q}%`; const params: unknown[] = [parishId]; let filter = ""; if (q) { filter = " AND (p.name LIKE ? OR p.baptismal_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR p.mobile LIKE ?)"; params.push(like, like, like, like, like); } const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.id, p.name, p.baptismal_name AS baptismalName, p.email, p.birth_date AS birthDate, p.phone, p.mobile, p.address, p.address_detail AS addressDetail, p.created_at AS joinedAt, (SELECT COUNT(*) FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id WHERE gm.parishioner_id=p.id AND gm.status='approved' AND g.parish_id=p.parish_id) AS groupCount,(SELECT COUNT(*) FROM sharing_mission_applications ma INNER JOIN sharing_missions m ON m.id=ma.mission_id WHERE ma.parishioner_id=p.id AND ma.status='approved' AND m.parish_id=p.parish_id) AS missionCount FROM parishioners p WHERE p.parish_id = ?${filter} ORDER BY p.created_at DESC, p.id DESC`, params); res.json(rows.map((row) => ({ ...row, id: Number(row.id), groupCount:Number(row.groupCount),missionCount:Number(row.missionCount) }))); } catch (error) { next(error); } });
app.get("/api/parish/parishioners/:id/groups",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),parishionerId=Number(req.params.id);const [people]=await pool.query<RowDataPacket[]>("SELECT id,name FROM parishioners WHERE id=? AND parish_id=? LIMIT 1",[parishionerId,parishId]);if(!people.length)return res.status(404).json({message:"신도 정보를 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT g.id,g.name_ko AS nameKo,g.name_en AS nameEn,g.regular_meeting AS regularMeeting,g.status,(g.icon_data IS NOT NULL) AS hasIcon,gm.joined_at AS joinedAt FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id WHERE gm.parishioner_id=? AND gm.status='approved' AND g.parish_id=? ORDER BY gm.joined_at DESC,g.name_ko",[parishionerId,parishId]);res.json({parishioner:{id:parishionerId,name:people[0]!.name},items:rows.map(row=>({...row,id:Number(row.id),regularMeeting:displayMeeting(row.regularMeeting),hasIcon:Boolean(row.hasIcon)}))})}catch(error){next(error)}});
app.get("/api/parish/parishioners/:id/missions",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),parishionerId=Number(req.params.id);const [people]=await pool.query<RowDataPacket[]>("SELECT id,name,baptismal_name AS baptismalName FROM parishioners WHERE id=? AND parish_id=?",[parishionerId,parishId]);if(!people.length)return res.status(404).json({message:"신도 정보를 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT m.id,m.title,m.author_type AS authorType,COALESCE(m.author_name,a.name) AS authorName,DATE_FORMAT(m.application_from,'%Y-%m-%d') AS applicationFrom,DATE_FORMAT(m.application_to,'%Y-%m-%d') AS applicationTo,DATE_FORMAT(ma.decided_at,'%Y-%m-%d %H:%i') AS approvedAt FROM sharing_mission_applications ma INNER JOIN sharing_missions m ON m.id=ma.mission_id LEFT JOIN parishioners a ON a.id=m.author_id WHERE ma.parishioner_id=? AND ma.status='approved' AND m.parish_id=? ORDER BY ma.decided_at DESC,m.title",[parishionerId,parishId]);res.json({parishioner:{...people[0],id:parishionerId},items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.get("/api/parish/groups",requireParish,async(_req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT g.id,g.name_ko,g.name_en,g.description,g.regular_meeting,g.operator_name,g.status,g.created_at,g.approved_at,(g.icon_data IS NOT NULL) AS has_icon,SUM(gm.status='approved') AS member_count,SUM(gm.status='requested') AS application_count,SUM(gm.status='withdrawal_requested') AS withdrawal_count FROM parish_groups g LEFT JOIN parish_group_members gm ON gm.group_id=g.id WHERE g.parish_id=? GROUP BY g.id ORDER BY FIELD(g.status,'requested','approved','rejected','suspended'),g.created_at DESC,g.id DESC",[Number(res.locals.parishSession.parish_id)]);res.json(rows.map(row=>({...groupDto(row),regularMeeting:row.regular_meeting?String(row.regular_meeting):"",withdrawalCount:Number(row.withdrawal_count)})))}catch(error){next(error)}});
app.get("/api/parish/groups/:id/members",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.id);const [groups]=await pool.query<RowDataPacket[]>("SELECT id,name_ko FROM parish_groups WHERE id=? AND parish_id=? LIMIT 1",[groupId,parishId]);if(!groups.length)return res.status(404).json({message:"단체를 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT p.id,p.name,p.baptismal_name AS baptismalName,p.mobile,p.email,gm.joined_at AS joinedAt FROM parish_group_members gm INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE gm.group_id=? AND p.parish_id=? AND gm.status='approved' ORDER BY gm.joined_at DESC,p.name",[groupId,parishId]);res.json({group:{id:groupId,nameKo:groups[0]!.name_ko},items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.get("/api/parish/groups/:id/applications",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.id);const [groups]=await pool.query<RowDataPacket[]>("SELECT id,name_ko FROM parish_groups WHERE id=? AND parish_id=? LIMIT 1",[groupId,parishId]);if(!groups.length)return res.status(404).json({message:"단체를 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT gm.id AS applicationId,p.id,p.name,p.baptismal_name AS baptismalName,p.birth_date AS birthDate,p.mobile,p.email,gm.application_message AS applicationMessage,gm.requested_at AS requestedAt FROM parish_group_members gm INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE gm.group_id=? AND p.parish_id=? AND gm.status='requested' ORDER BY gm.requested_at,p.name",[groupId,parishId]);res.json({group:{id:groupId,nameKo:groups[0]!.name_ko},items:rows.map(row=>({...row,applicationId:Number(row.applicationId),id:Number(row.id)}))})}catch(error){next(error)}});
app.get("/api/parish/groups/:id/withdrawals",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.id);const [groups]=await pool.query<RowDataPacket[]>("SELECT id,name_ko,operator_name FROM parish_groups WHERE id=? AND parish_id=?",[groupId,parishId]);if(!groups.length)return res.status(404).json({message:"단체를 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT gm.id,p.name,p.baptismal_name AS baptismalName,p.email,p.mobile,gm.withdrawal_request_reason AS requestReason,gm.withdrawal_requested_at AS requestedAt FROM parish_group_members gm INNER JOIN parishioners p ON p.id=gm.parishioner_id WHERE gm.group_id=? AND gm.status='withdrawal_requested' ORDER BY gm.withdrawal_requested_at",[groupId]);res.json({group:groups[0],items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.patch("/api/parish/groups/:groupId/withdrawals/:id",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.groupId),membershipId=Number(req.params.id),decision=String(req.body.decision??""),reason=String(req.body.reason??"").trim();if(decision!=="approved"&&decision!=="rejected")return res.status(400).json({message:"승인 또는 반려를 선택해 주세요."});if(decision==="rejected"&&!reason)return res.status(400).json({message:"탈퇴 요청 반려 사유를 입력해 주세요."});if(reason.length>1000)return res.status(400).json({message:"반려 사유는 1,000자 이내로 작성해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT gm.parishioner_id,g.name_ko FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id WHERE gm.id=? AND gm.group_id=? AND gm.status='withdrawal_requested' AND g.parish_id=?",[membershipId,groupId,parishId]);if(!targets.length)return res.status(404).json({message:"처리할 탈퇴 요청을 찾을 수 없습니다."});const target=targets[0]!;await pool.execute("UPDATE parish_group_members SET status=?,joined_at=IF(?='approved',NULL,joined_at),withdrawal_reason=?,decided_at=NOW() WHERE id=?",[decision==="approved"?"withdrawn":"approved",decision,decision==="rejected"?reason:null,membershipId]);await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group',?)",[parishId,target.parishioner_id,"group_withdrawal_decision","단체 탈퇴 결과",decision==="approved"?`'${target.name_ko}' 단체 탈퇴가 승인되었습니다.`:`'${target.name_ko}' 단체 탈퇴 요청이 반려되었습니다. 사유: ${reason}`,groupId]);res.json({message:decision==="approved"?"단체 탈퇴를 승인했습니다.":"단체 탈퇴 요청을 반려했습니다."})}catch(error){next(error)}});
app.patch("/api/parish/groups/:groupId/applications/:applicationId",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.groupId),applicationId=Number(req.params.applicationId),decision=String(req.body.decision??""),reason=String(req.body.reason??"").trim();if(!["approved","rejected"].includes(decision))return res.status(400).json({message:"승인 또는 반려를 선택해 주세요."});if(decision==="rejected"&&!reason)return res.status(400).json({message:"반려 사유를 입력해 주세요."});if(reason.length>1000)return res.status(400).json({message:"반려 사유는 1,000자 이내로 입력해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT gm.parishioner_id,g.name_ko FROM parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id WHERE gm.id=? AND gm.group_id=? AND gm.status='requested' AND g.parish_id=?",[applicationId,groupId,parishId]);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_group_members gm INNER JOIN parish_groups g ON g.id=gm.group_id SET gm.status=?,gm.joined_at=IF(?='approved',NOW(),NULL),gm.rejection_reason=?,gm.decided_at=NOW(),gm.notification_read_at=NULL WHERE gm.id=? AND gm.group_id=? AND gm.status='requested' AND g.parish_id=?",[decision,decision,decision==="rejected"?reason:null,applicationId,groupId,parishId]);if(!result.affectedRows)return res.status(404).json({message:"처리할 가입 신청을 찾을 수 없습니다."});if(targets[0])await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group',?)",[parishId,targets[0].parishioner_id,"group_membership_decision","단체 가입 결과",decision==="approved"?`'${targets[0].name_ko}' 가입이 승인되었습니다.`:`'${targets[0].name_ko}' 가입이 반려되었습니다. 사유: ${reason}`,groupId]);res.json({message:decision==="approved"?"단체 가입을 승인했습니다.":"단체 가입을 반려했습니다."})}catch(error){next(error)}});
app.post("/api/parish/groups",requireParish,async(req,res,next)=>{try{const value=groupPayload(req.body),errors=groupErrors(value);if(Object.keys(errors).length)return res.status(400).json({message:"입력 내용을 확인해 주세요.",errors});const parishId=Number(res.locals.parishSession.parish_id),userKey=String(res.locals.parishSession.user_key),email=userKey.slice(userKey.indexOf(":")+1);const [admins]=await pool.query<RowDataPacket[]>("SELECT COALESCE(name,email) AS name FROM parish_admins WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]);const operator=String(admins[0]?.name??email);const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_groups (parish_id,icon_type,icon_data,name_ko,name_en,description,regular_meeting,creator_type,operator_name,status,approved_at) VALUES (?,?,?,?,?,?,?,'parish',?,'approved',NOW())",[parishId,value.iconType||null,value.iconData?Buffer.from(value.iconData,"base64"):null,value.nameKo,value.nameEn||null,value.description||null,value.regularMeeting||null,operator]);res.status(201).json({message:"단체가 승인 상태로 등록되었습니다.",id:result.insertId})}catch(error){next(error)}});
app.patch("/api/parish/groups/:id",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.id),value=groupPayload(req.body),status=String(req.body.status??"");const errors=groupErrors(value);if(!["requested","approved","rejected","suspended"].includes(status))errors.status="올바른 상태를 선택해 주세요.";if(Object.keys(errors).length)return res.status(400).json({message:"입력 내용을 확인해 주세요.",errors});const params:Array<string|number|Buffer|null>=[value.nameKo,value.nameEn||null,value.description||null,value.regularMeeting||null,status,status,groupId,parishId];let sql="UPDATE parish_groups SET name_ko=?,name_en=?,description=?,regular_meeting=?,status=?,approved_at=IF(?='approved',COALESCE(approved_at,NOW()),approved_at)";if(value.iconData){sql+=",icon_type=?,icon_data=?";params.splice(6,0,value.iconType,Buffer.from(value.iconData,"base64"))}sql+=" WHERE id=? AND parish_id=?";const [result]=await pool.execute<mysql.ResultSetHeader>(sql,params);if(!result.affectedRows)return res.status(404).json({message:"모임을 찾을 수 없습니다."});res.json({message:"모임 정보를 저장했습니다."})}catch(error){next(error)}});
app.patch("/api/parish/groups/:id/status",requireParish,async(req,res,next)=>{try{const status=String(req.body.status??""),groupId=Number(req.params.id),parishId=Number(res.locals.parishSession.parish_id);if(!["requested","approved","rejected","suspended"].includes(status))return res.status(400).json({message:"올바른 상태를 선택해 주세요."});const [targets]=await pool.query<RowDataPacket[]>("SELECT creator_parishioner_id,name_ko FROM parish_groups WHERE id=? AND parish_id=?",[groupId,parishId]);const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_groups SET status=?,approved_at=IF(?='approved',COALESCE(approved_at,NOW()),approved_at) WHERE id=? AND parish_id=?",[status,status,groupId,parishId]);if(!result.affectedRows)return res.status(404).json({message:"단체를 찾을 수 없습니다."});if(targets[0]?.creator_parishioner_id)await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,?,?,?,'group',?)",[parishId,targets[0].creator_parishioner_id,"group_decision","단체 상태 변경",`'${targets[0].name_ko}' 단체 상태가 ${status==="approved"?"승인":status==="rejected"?"반려":status==="suspended"?"중지":"승인신청"}으로 변경되었습니다.`,groupId]);res.json({message:"단체 상태가 변경되었습니다."})}catch(error){next(error)}});
app.get("/api/parish/groups/:id/contents",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.id),type=String(req.query.type??"");if(!["notice","board"].includes(type))return res.status(400).json({message:"게시물 종류를 확인해 주세요."});const [groups]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_groups WHERE id=? AND parish_id=?",[groupId,parishId]);if(!groups.length)return res.status(404).json({message:"모임을 찾을 수 없습니다."});const [rows]=await pool.query<RowDataPacket[]>("SELECT c.id,c.title,c.content,COALESCE(c.author_name,p.name,'성당 관리자') AS authorName,c.created_at AS createdAt,c.updated_at AS updatedAt FROM parish_group_contents c LEFT JOIN parishioners p ON p.id=c.author_parishioner_id WHERE c.group_id=? AND c.content_type=? ORDER BY c.created_at DESC,c.id DESC",[groupId,type]);res.json({items:rows.map(row=>({...row,id:Number(row.id)}))})}catch(error){next(error)}});
app.post("/api/parish/groups/:id/contents",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.id),type=String(req.body.type??""),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim();if(!["notice","board"].includes(type))return res.status(400).json({message:"게시물 종류를 확인해 주세요."});if(!title||!content||title.length>200||content.length>20000)return res.status(400).json({message:"제목과 내용을 입력 가능한 길이로 작성해 주세요."});const [groups]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_groups WHERE id=? AND parish_id=?",[groupId,parishId]);if(!groups.length)return res.status(404).json({message:"모임을 찾을 수 없습니다."});const userKey=String(res.locals.parishSession.user_key),email=userKey.slice(userKey.indexOf(":")+1),[admins]=await pool.query<RowDataPacket[]>("SELECT COALESCE(name,email) AS name FROM parish_admins WHERE parish_id=? AND email=? LIMIT 1",[parishId,email]),authorName=String(admins[0]?.name??email);const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_group_contents (group_id,author_parishioner_id,author_name,content_type,title,content) VALUES (?,NULL,?,?,?,?)",[groupId,authorName,type,title,content]);res.status(201).json({id:Number(result.insertId),message:type==="notice"?"공지사항을 등록했습니다.":"게시글을 등록했습니다."})}catch(error){next(error)}});
app.patch("/api/parish/groups/:groupId/contents/:contentId",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),groupId=Number(req.params.groupId),contentId=Number(req.params.contentId),title=String(req.body.title??"").trim(),content=String(req.body.content??"").trim();if(!title||!content||title.length>200||content.length>20000)return res.status(400).json({message:"제목과 내용을 입력 가능한 길이로 작성해 주세요."});const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_group_contents c INNER JOIN parish_groups g ON g.id=c.group_id SET c.title=?,c.content=? WHERE c.id=? AND c.group_id=? AND g.parish_id=?",[title,content,contentId,groupId,parishId]);if(!result.affectedRows)return res.status(404).json({message:"게시물을 찾을 수 없습니다."});res.json({message:"게시물을 수정했습니다."})}catch(error){next(error)}});
app.delete("/api/parish/groups/:groupId/contents/:contentId",requireParish,async(req,res,next)=>{try{const [result]=await pool.execute<mysql.ResultSetHeader>("DELETE c FROM parish_group_contents c INNER JOIN parish_groups g ON g.id=c.group_id WHERE c.id=? AND c.group_id=? AND g.parish_id=?",[Number(req.params.contentId),Number(req.params.groupId),Number(res.locals.parishSession.parish_id)]);if(!result.affectedRows)return res.status(404).json({message:"게시물을 찾을 수 없습니다."});res.json({message:"게시물을 삭제했습니다."})}catch(error){next(error)}});
app.get("/api/parish/groups/:id/icon",requireParish,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT icon_type,icon_data FROM parish_groups WHERE id=? AND parish_id=? LIMIT 1",[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!rows.length||!rows[0]!.icon_data)return res.status(404).end();res.type(String(rows[0]!.icon_type));res.send(rows[0]!.icon_data)}catch(error){next(error)}});
app.post("/api/parish-auth/logout", requireParish, async (_req, res, next) => {
  try {
    await pool.execute("UPDATE login_sessions SET logged_out_at = NOW(), logout_reason = 'manual' WHERE id = ? AND logged_out_at IS NULL", [res.locals.parishSession.id]);
    res.setHeader("Set-Cookie", sessionCookie("parish_session", "", 0));
    res.json({ message: "로그아웃되었습니다." });
  } catch (error) { next(error); }
});

app.get("/api/parish/profile", requireParish, async (_req, res, next) => {
  try {
    const userKey = String(res.locals.parishSession.user_key);
    const email = userKey.slice(userKey.indexOf(":") + 1);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.name, p.parish_code, p.phone, p.postal_code, p.address, p.address_detail, p.diocese, p.district,
              p.jurisdiction, p.office_phone, p.fax, p.homepage, p.approval_status, p.modified_at,
              pa.name AS manager_name, pa.email AS manager_email
       FROM parishes p LEFT JOIN parish_admins pa ON pa.parish_id = p.id AND pa.email = ?
       WHERE p.id = ? LIMIT 1`, [email, res.locals.parishSession.parish_id],
    );
    if (!rows.length) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
    res.json(rows[0]);
  } catch (error) { next(error); }
});

app.patch("/api/parish/profile", requireParish, async (req, res, next) => {
  try {
    const values = {
      managerName: String(req.body.managerName ?? "").trim(),
      name: String(req.body.name ?? "").trim(), parishCode: String(req.body.parishCode ?? "").trim(),
      phone: String(req.body.phone ?? "").trim(), postalCode: String(req.body.postalCode ?? "").trim(),
      address: String(req.body.address ?? "").trim(), addressDetail: String(req.body.addressDetail ?? "").trim(),
      diocese: String(req.body.diocese ?? "").trim(), district: String(req.body.district ?? "").trim(),
      jurisdiction: String(req.body.jurisdiction ?? "").trim(), officePhone: String(req.body.officePhone ?? "").trim(),
      fax: String(req.body.fax ?? "").trim(), homepage: String(req.body.homepage ?? "").trim(),
    };
    const errors: Record<string, string> = {};
    const [currentRows] = await pool.query<RowDataPacket[]>(
      "SELECT name, parish_code, approval_status FROM parishes WHERE id = ? LIMIT 1",
      [res.locals.parishSession.parish_id],
    );
    const current = currentRows[0];
    if (!current) return res.status(404).json({ message: "성당 정보를 찾을 수 없습니다." });
    if (current.approval_status === "approved") {
      if (values.name !== current.name) errors.name = "승인 완료된 성당은 성당 이름을 변경할 수 없습니다.";
      if (values.parishCode !== current.parish_code) errors.parishCode = "승인 완료된 성당은 성당 ID를 변경할 수 없습니다.";
    }
    if (values.managerName.length < 2 || values.managerName.length > 100) errors.managerName = "담당자 이름을 2~100자로 입력해 주세요.";
    if (values.name.length < 2 || values.name.length > 120) errors.name = "성당 이름은 2~120자로 입력해 주세요.";
    if (!parishCodePattern.test(values.parishCode)) errors.parishCode = "성당 ID는 영문, 숫자, _, -를 사용해 2~40자로 입력해 주세요.";
    if (!phonePattern.test(values.phone)) errors.phone = "전화번호 형식을 확인해 주세요.";
    if (!/^\d{5}$/.test(values.postalCode)) errors.postalCode = "주소 검색으로 우편번호를 선택해 주세요.";
    if (!values.address) errors.address = "기본 주소를 선택해 주세요.";
    if (!values.addressDetail) errors.addressDetail = "상세 주소를 입력해 주세요.";
    if (!values.diocese) errors.diocese = "교구를 입력해 주세요.";
    if (!values.district) errors.district = "지구를 입력해 주세요.";
    if (!values.jurisdiction) errors.jurisdiction = "관할을 입력해 주세요.";
    if (!phonePattern.test(values.officePhone)) errors.officePhone = "전화번호 형식을 확인해 주세요.";
    if (values.fax && !phonePattern.test(values.fax)) errors.fax = "팩스 형식을 확인해 주세요.";
    if (values.homepage) { try { const url = new URL(values.homepage); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { errors.homepage = "올바른 홈페이지 URL을 입력해 주세요."; } }
    if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors });
    const userKey = String(res.locals.parishSession.user_key);
    const editor = userKey.slice(userKey.indexOf(":") + 1);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE parishes SET name=?, parish_code=?, phone=?, postal_code=?, address=?, address_detail=?,
         diocese=?, district=?, jurisdiction=?, office_phone=?, fax=?, homepage=?, modified_by=?, modified_at=NOW() WHERE id=?`,
        [values.name, values.parishCode, values.phone, values.postalCode, values.address, values.addressDetail,
         values.diocese, values.district, values.jurisdiction, values.officePhone, values.fax || null,
         values.homepage || null, editor, res.locals.parishSession.parish_id],
      );
      await connection.execute("UPDATE parish_admins SET name = ? WHERE parish_id = ? AND email = ?", [values.managerName, res.locals.parishSession.parish_id, editor]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    res.json({ message: "성당 기본정보가 저장되었습니다." });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return res.status(409).json({ message: "이미 사용 중인 성당 ID입니다." });
    next(error);
  }
});

const priestFields = {
  name: { column: "name", required: true }, baptismalName: { column: "baptismal_name", required: true },
  role: { column: "role", required: true }, appointmentDate: { column: "appointment_date", required: false },
  affiliation: { column: "affiliation", required: false }, generation: { column: "generation", required: false },
  birthDate: { column: "birth_date", required: false }, mobile: { column: "mobile", required: false },
  email: { column: "email", required: false }, status: { column: "status", required: true },
  incomingDate: { column: "incoming_date", required: true }, outgoingDate: { column: "outgoing_date", required: false },
} as const;
type PriestFieldKey = keyof typeof priestFields;
const priestRoles = ["주임", "보좌", "은경축", "수도회", "부주임"];

async function getPriestSettings(parishId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT field_key, enabled, required_field, searchable, display_order, alignment, frozen FROM parish_priest_field_settings WHERE parish_id = ?", [parishId],
  );
  const stored = new Map(rows.map((row) => [String(row.field_key), row]));
  return (Object.keys(priestFields) as PriestFieldKey[]).map((key, index) => {
    const row = stored.get(key);
    return { key, enabled: row ? Boolean(row.enabled) : true, required: row ? Boolean(row.required_field) : priestFields[key].required, searchable: row ? Boolean(row.searchable) : ["name", "baptismalName", "role", "status"].includes(key), displayOrder: row ? Number(row.display_order) : index, alignment: row && ["left", "center", "right"].includes(String(row.alignment)) ? String(row.alignment) : "left", frozen: row ? Boolean(row.frozen) : false };
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}

async function ensurePriestRevision(parishId: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM parish_priest_setting_revisions WHERE parish_id = ? LIMIT 1", [parishId]);
  if (!rows.length) await pool.execute("INSERT INTO parish_priest_setting_revisions (parish_id, revision_no, settings_json, is_active) VALUES (?, 1, ?, 1)", [parishId, JSON.stringify(await getPriestSettings(parishId))]);
}

async function applyPriestSettings(connection: mysql.PoolConnection, parishId: number, settings: Array<Record<string, unknown>>) {
  for (const key of Object.keys(priestFields) as PriestFieldKey[]) {
    const item = settings.find((entry) => entry.key === key) ?? {};
    const alwaysEnabled = key === "baptismalName" || key === "status" || key === "incomingDate" || key === "outgoingDate";
    const enabled = alwaysEnabled ? true : Boolean(item.enabled);
    const required = key === "baptismalName" || key === "incomingDate" ? true : enabled && Boolean(item.required);
    const searchable = enabled && Boolean(item.searchable) && key !== "outgoingDate";
    const displayOrder = Number.isInteger(Number(item.displayOrder)) ? Math.max(0, Number(item.displayOrder)) : 0;
    const alignment = ["left", "center", "right"].includes(String(item.alignment)) ? String(item.alignment) : "left";
    const frozen = enabled && Boolean(item.frozen);
    await connection.execute(
      `INSERT INTO parish_priest_field_settings (parish_id, field_key, enabled, required_field, searchable, display_order, alignment, frozen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), required_field=VALUES(required_field), searchable=VALUES(searchable), display_order=VALUES(display_order), alignment=VALUES(alignment), frozen=VALUES(frozen)`,
      [parishId, key, enabled, required, searchable, displayOrder, alignment, frozen],
    );
  }
}

async function getNunSettings(parishId: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT field_key, enabled, required_field, searchable, display_order, alignment, frozen FROM parish_nun_field_settings WHERE parish_id = ?", [parishId]);
  const stored = new Map(rows.map((row) => [String(row.field_key), row]));
  return (Object.keys(priestFields) as PriestFieldKey[]).map((key, index) => { const row = stored.get(key); return { key, enabled: row ? Boolean(row.enabled) : true, required: row ? Boolean(row.required_field) : priestFields[key].required, searchable: row ? Boolean(row.searchable) : ["name", "baptismalName", "role", "status"].includes(key), displayOrder: row ? Number(row.display_order) : index, alignment: row && ["left", "center", "right"].includes(String(row.alignment)) ? String(row.alignment) : "left", frozen: row ? Boolean(row.frozen) : false }; }).sort((a, b) => a.displayOrder - b.displayOrder);
}
async function applyNunSettings(connection: mysql.PoolConnection, parishId: number, settings: Array<Record<string, unknown>>) {
  for (const key of Object.keys(priestFields) as PriestFieldKey[]) { const item = settings.find((entry) => entry.key === key) ?? {}; const alwaysEnabled = ["status", "incomingDate", "outgoingDate"].includes(key); const enabled = alwaysEnabled ? true : Boolean(item.enabled); const required = key === "incomingDate" ? true : enabled && Boolean(item.required); const searchable = enabled && Boolean(item.searchable) && key !== "outgoingDate"; const displayOrder = Number.isInteger(Number(item.displayOrder)) ? Math.max(0, Number(item.displayOrder)) : 0; const alignment = ["left", "center", "right"].includes(String(item.alignment)) ? String(item.alignment) : "left"; const frozen = enabled && Boolean(item.frozen); await connection.execute(`INSERT INTO parish_nun_field_settings (parish_id, field_key, enabled, required_field, searchable, display_order, alignment, frozen) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), required_field=VALUES(required_field), searchable=VALUES(searchable), display_order=VALUES(display_order), alignment=VALUES(alignment), frozen=VALUES(frozen)`, [parishId, key, enabled, required, searchable, displayOrder, alignment, frozen]); }
}
async function ensureNunRevision(parishId: number) { const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM parish_nun_setting_revisions WHERE parish_id = ? LIMIT 1", [parishId]); if (!rows.length) await pool.execute("INSERT INTO parish_nun_setting_revisions (parish_id, revision_no, settings_json, is_active) VALUES (?, 1, ?, 1)", [parishId, JSON.stringify(await getNunSettings(parishId))]); }

app.get("/api/parish/priests/settings", requireParish, async (_req, res, next) => {
  try { res.json(await getPriestSettings(Number(res.locals.parishSession.parish_id))); }
  catch (error) { next(error); }
});

app.get("/api/parish/priests/settings/revisions", requireParish, async (_req, res, next) => {
  try {
    const parishId = Number(res.locals.parishSession.parish_id);
    await ensurePriestRevision(parishId);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, revision_no, is_active, created_at FROM parish_priest_setting_revisions WHERE parish_id = ? ORDER BY revision_no DESC", [parishId]);
    res.json(rows.map((row) => ({ id: Number(row.id), revisionNo: Number(row.revision_no), active: Boolean(row.is_active), createdAt: row.created_at })));
  } catch (error) { next(error); }
});

app.post("/api/parish/priests/settings/revisions/:id/activate", requireParish, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const parishId = Number(res.locals.parishSession.parish_id), id = Number(req.params.id);
    const [rows] = await connection.query<RowDataPacket[]>("SELECT settings_json FROM parish_priest_setting_revisions WHERE id = ? AND parish_id = ? LIMIT 1", [id, parishId]);
    if (!rows.length) return res.status(404).json({ message: "Revision을 찾을 수 없습니다." });
    const settings = JSON.parse(String(rows[0]!.settings_json)) as Array<Record<string, unknown>>;
    await connection.beginTransaction();
    await applyPriestSettings(connection, parishId, settings);
    await connection.execute("UPDATE parish_priest_setting_revisions SET is_active = (id = ?) WHERE parish_id = ?", [id, parishId]);
    await connection.commit();
    res.json({ message: "선택한 Revision이 등록 폼에 적용되었습니다.", settings: await getPriestSettings(parishId) });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

app.put("/api/parish/priests/settings", requireParish, async (req, res, next) => {
  try {
    const settings = Array.isArray(req.body.settings) ? req.body.settings : [];
    const parishId = Number(res.locals.parishSession.parish_id);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await applyPriestSettings(connection, parishId, settings);
      const [revisionRows] = await connection.query<RowDataPacket[]>("SELECT COALESCE(MAX(revision_no), 0) + 1 AS next_no FROM parish_priest_setting_revisions WHERE parish_id = ?", [parishId]);
      const revisionNo = Number(revisionRows[0]!.next_no);
      await connection.execute("UPDATE parish_priest_setting_revisions SET is_active = 0 WHERE parish_id = ?", [parishId]);
      await connection.execute("INSERT INTO parish_priest_setting_revisions (parish_id, revision_no, settings_json, is_active) VALUES (?, ?, ?, 1)", [parishId, revisionNo, JSON.stringify(settings)]);
      await connection.commit();
      res.json({ message: `Revision ${revisionNo}이 저장되어 등록 폼에 적용되었습니다.`, settings: await getPriestSettings(parishId), revisionNo });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  } catch (error) { next(error); }
});

app.get("/api/parish/priests", requireParish, async (req, res, next) => {
  try {
    const parishId = Number(res.locals.parishSession.parish_id);
    const settings = await getPriestSettings(parishId);
    const searchable = new Set(settings.filter((item) => item.searchable).map((item) => item.key));
    const field = String(req.query.field ?? "");
    const query = String(req.query.q ?? "").trim();
    const params: unknown[] = [parishId];
    let filter = "";
    if (query) {
      const keys = field && searchable.has(field as PriestFieldKey) ? [field as PriestFieldKey] : [...searchable];
      if (keys.length) {
        filter = ` AND (${keys.map((key) => `CAST(${priestFields[key].column} AS CHAR) LIKE ?`).join(" OR ")})`;
        params.push(...keys.map(() => `%${query}%`));
      }
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, baptismal_name, role, appointment_date, affiliation, generation, birth_date,
              mobile, email, status, incoming_date, outgoing_date, created_at, updated_at
       FROM parish_priests WHERE parish_id = ?${filter} ORDER BY status ASC, incoming_date DESC, id DESC`, params,
    );
    res.json(rows);
  } catch (error) { next(error); }
});

function priestPayload(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? "").trim(), baptismalName: String(body.baptismalName ?? "").trim(),
    role: String(body.role ?? "").trim(), appointmentDate: String(body.appointmentDate ?? "").trim(),
    affiliation: String(body.affiliation ?? "").trim(), generation: String(body.generation ?? "").trim(),
    birthDate: String(body.birthDate ?? "").trim(), mobile: String(body.mobile ?? "").trim(),
    email: normalizeEmail(body.email), incomingDate: String(body.incomingDate ?? "").trim(),
    outgoingDate: String(body.outgoingDate ?? "").trim(), status: String(body.status ?? "incoming"),
  };
}

async function validatePriest(parishId: number, values: ReturnType<typeof priestPayload>, creating: boolean) {
  const settings = await getPriestSettings(parishId);
  const errors: Record<string, string> = {};
  for (const item of settings) {
    if (!item.enabled || !item.required) continue;
    const value = values[item.key as keyof typeof values];
    if (value === "" || value === null || value === undefined) errors[item.key] = "필수 입력 항목입니다.";
  }
  if (values.name && (values.name.length < 2 || values.name.length > 100)) errors.name = "이름은 2~100자로 입력해 주세요.";
  if (values.role && !priestRoles.includes(values.role)) errors.role = "올바른 역할을 선택해 주세요.";
  if (values.generation && (!/^\d+$/.test(values.generation) || Number(values.generation) < 1)) errors.generation = "세대는 1 이상의 숫자로 입력해 주세요.";
  if (values.mobile && !mobilePattern.test(values.mobile)) errors.mobile = "모바일폰번호는 010으로 시작하는 11자리 번호를 입력해 주세요.";
  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "올바른 이메일을 입력해 주세요.";
  if (!values.baptismalName) errors.baptismalName = "세례명을 입력해 주세요.";
  for (const key of ["appointmentDate", "birthDate", "incomingDate", "outgoingDate"] as const) if (values[key] && !/^\d{4}-\d{2}-\d{2}$/.test(values[key])) errors[key] = "날짜 형식을 확인해 주세요.";
  if (creating && !values.incomingDate) errors.incomingDate = "최초 등록 시 전입일은 필수입니다.";
  return errors;
}

app.post("/api/parish/priests", requireParish, async (req, res, next) => {
  try {
    const parishId = Number(res.locals.parishSession.parish_id);
    const values = priestPayload(req.body);
    values.status = "incoming";
    values.outgoingDate = "";
    const errors = await validatePriest(parishId, values, true);
    if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors });
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `INSERT INTO parish_priests (parish_id, name, baptismal_name, role, appointment_date, affiliation, generation, birth_date, mobile, email, status, incoming_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'incoming', ?)`,
      [parishId, values.name || null, values.baptismalName || null, values.role || null, values.appointmentDate || null,
       values.affiliation || null, values.generation ? Number(values.generation) : null, values.birthDate || null,
       values.mobile || null, values.email || null, values.incomingDate],
    );
    res.status(201).json({ message: "신부 정보가 등록되었습니다.", id: result.insertId });
  } catch (error) { next(error); }
});

app.patch("/api/parish/priests/:id", requireParish, async (req, res, next) => {
  try {
    const parishId = Number(res.locals.parishSession.parish_id);
    const id = Number(req.params.id);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT status FROM parish_priests WHERE id = ? AND parish_id = ? LIMIT 1", [id, parishId]);
    const current = rows[0];
    if (!current) return res.status(404).json({ message: "신부 정보를 찾을 수 없습니다." });
    const values = priestPayload(req.body);
    if (current.status === "outgoing" && values.status !== "outgoing") return res.status(400).json({ message: "전출 상태는 전입으로 되돌릴 수 없습니다." });
    if (values.status === "outgoing" && current.status !== "incoming") return res.status(400).json({ message: "전입 상태에서만 전출 처리할 수 있습니다." });
    if (values.status === "outgoing" && !values.outgoingDate) return res.status(400).json({ message: "전출일을 입력해 주세요.", errors: { outgoingDate: "전출일은 필수입니다." } });
    if (values.status === "incoming") values.outgoingDate = "";
    const errors = await validatePriest(parishId, values, false);
    if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors });
    await pool.execute(
      `UPDATE parish_priests SET name=?, baptismal_name=?, role=?, appointment_date=?, affiliation=?, generation=?,
       birth_date=?, mobile=?, email=?, status=?, incoming_date=?, outgoing_date=? WHERE id=? AND parish_id=?`,
      [values.name || null, values.baptismalName || null, values.role || null, values.appointmentDate || null,
       values.affiliation || null, values.generation ? Number(values.generation) : null, values.birthDate || null,
       values.mobile || null, values.email || null, values.status, values.incomingDate || null,
       values.outgoingDate || null, id, parishId],
    );
    res.json({ message: "신부 정보가 수정되었습니다." });
  } catch (error) { next(error); }
});

async function validateNun(parishId: number, values: ReturnType<typeof priestPayload>, creating: boolean) { const settings = await getNunSettings(parishId); const errors: Record<string, string> = {}; for (const item of settings) { if (item.enabled && item.required) { const value = values[item.key as keyof typeof values]; if (value === "" || value == null) errors[item.key] = "필수 입력 항목입니다."; } } if (values.name && (values.name.length < 2 || values.name.length > 100)) errors.name = "이름은 2~100자로 입력해 주세요."; if (values.role && !priestRoles.includes(values.role)) errors.role = "올바른 역할을 선택해 주세요."; if (values.generation && (!/^\d+$/.test(values.generation) || Number(values.generation) < 1)) errors.generation = "세대는 1 이상의 숫자로 입력해 주세요."; if (values.mobile && !mobilePattern.test(values.mobile)) errors.mobile = "모바일폰번호는 010으로 시작하는 11자리 번호를 입력해 주세요."; if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "올바른 이메일을 입력해 주세요."; for (const key of ["appointmentDate", "birthDate", "incomingDate", "outgoingDate"] as const) if (values[key] && !/^\d{4}-\d{2}-\d{2}$/.test(values[key])) errors[key] = "날짜 형식을 확인해 주세요."; if (creating && !values.incomingDate) errors.incomingDate = "최초 등록 시 전입일은 필수입니다."; return errors; }

app.get("/api/parish/nuns/settings", requireParish, async (_req, res, next) => { try { res.json(await getNunSettings(Number(res.locals.parishSession.parish_id))); } catch (error) { next(error); } });
app.get("/api/parish/nuns/settings/revisions", requireParish, async (_req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id); await ensureNunRevision(parishId); const [rows] = await pool.query<RowDataPacket[]>("SELECT id, revision_no, is_active, created_at FROM parish_nun_setting_revisions WHERE parish_id = ? ORDER BY revision_no DESC", [parishId]); res.json(rows.map((row) => ({ id: Number(row.id), revisionNo: Number(row.revision_no), active: Boolean(row.is_active), createdAt: row.created_at }))); } catch (error) { next(error); } });
app.post("/api/parish/nuns/settings/revisions/:id/activate", requireParish, async (req, res, next) => { const connection = await pool.getConnection(); try { const parishId = Number(res.locals.parishSession.parish_id), id = Number(req.params.id); const [rows] = await connection.query<RowDataPacket[]>("SELECT settings_json FROM parish_nun_setting_revisions WHERE id = ? AND parish_id = ? LIMIT 1", [id, parishId]); if (!rows.length) return res.status(404).json({ message: "Revision을 찾을 수 없습니다." }); const settings = JSON.parse(String(rows[0]!.settings_json)) as Array<Record<string, unknown>>; await connection.beginTransaction(); await applyNunSettings(connection, parishId, settings); await connection.execute("UPDATE parish_nun_setting_revisions SET is_active = (id = ?) WHERE parish_id = ?", [id, parishId]); await connection.commit(); res.json({ message: "선택한 Revision이 수녀 등록 폼에 적용되었습니다.", settings: await getNunSettings(parishId) }); } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); } });
app.put("/api/parish/nuns/settings", requireParish, async (req, res, next) => { const connection = await pool.getConnection(); try { const settings = Array.isArray(req.body.settings) ? req.body.settings : [], parishId = Number(res.locals.parishSession.parish_id); await connection.beginTransaction(); await applyNunSettings(connection, parishId, settings); const [rows] = await connection.query<RowDataPacket[]>("SELECT COALESCE(MAX(revision_no), 0) + 1 AS next_no FROM parish_nun_setting_revisions WHERE parish_id = ?", [parishId]); const revisionNo = Number(rows[0]!.next_no); await connection.execute("UPDATE parish_nun_setting_revisions SET is_active = 0 WHERE parish_id = ?", [parishId]); await connection.execute("INSERT INTO parish_nun_setting_revisions (parish_id, revision_no, settings_json, is_active) VALUES (?, ?, ?, 1)", [parishId, revisionNo, JSON.stringify(settings)]); await connection.commit(); res.json({ message: `수녀 관리항목 Revision ${revisionNo}이 저장되었습니다.`, settings: await getNunSettings(parishId) }); } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); } });
app.get("/api/parish/nuns", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), settings = await getNunSettings(parishId), searchable = new Set(settings.filter((item) => item.searchable).map((item) => item.key)), field = String(req.query.field ?? ""), query = String(req.query.q ?? "").trim(), params: unknown[] = [parishId]; let filter = ""; if (query) { const keys = field && searchable.has(field as PriestFieldKey) ? [field as PriestFieldKey] : [...searchable]; if (keys.length) { filter = ` AND (${keys.map((key) => `CAST(${priestFields[key].column} AS CHAR) LIKE ?`).join(" OR ")})`; params.push(...keys.map(() => `%${query}%`)); } } const [rows] = await pool.query<RowDataPacket[]>(`SELECT id, name, baptismal_name, role, appointment_date, affiliation, generation, birth_date, mobile, email, status, incoming_date, outgoing_date, created_at, updated_at FROM parish_nuns WHERE parish_id = ?${filter} ORDER BY status ASC, incoming_date DESC, id DESC`, params); res.json(rows); } catch (error) { next(error); } });
app.post("/api/parish/nuns", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), values = priestPayload(req.body); values.status = "incoming"; values.outgoingDate = ""; const errors = await validateNun(parishId, values, true); if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors }); const [result] = await pool.execute<mysql.ResultSetHeader>(`INSERT INTO parish_nuns (parish_id, name, baptismal_name, role, appointment_date, affiliation, generation, birth_date, mobile, email, status, incoming_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'incoming', ?)`, [parishId, values.name || null, values.baptismalName || null, values.role || null, values.appointmentDate || null, values.affiliation || null, values.generation ? Number(values.generation) : null, values.birthDate || null, values.mobile || null, values.email || null, values.incomingDate]); res.status(201).json({ message: "수녀 정보가 등록되었습니다.", id: result.insertId }); } catch (error) { next(error); } });
app.patch("/api/parish/nuns/:id", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), id = Number(req.params.id); const [rows] = await pool.query<RowDataPacket[]>("SELECT status FROM parish_nuns WHERE id = ? AND parish_id = ? LIMIT 1", [id, parishId]); const current = rows[0]; if (!current) return res.status(404).json({ message: "수녀 정보를 찾을 수 없습니다." }); const values = priestPayload(req.body); if (current.status === "outgoing" && values.status !== "outgoing") return res.status(400).json({ message: "전출 상태는 전입으로 되돌릴 수 없습니다." }); if (values.status === "outgoing" && !values.outgoingDate) return res.status(400).json({ message: "전출일을 입력해 주세요.", errors: { outgoingDate: "전출일은 필수입니다." } }); if (values.status === "incoming") values.outgoingDate = ""; const errors = await validateNun(parishId, values, false); if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors }); await pool.execute(`UPDATE parish_nuns SET name=?, baptismal_name=?, role=?, appointment_date=?, affiliation=?, generation=?, birth_date=?, mobile=?, email=?, status=?, incoming_date=?, outgoing_date=? WHERE id=? AND parish_id=?`, [values.name || null, values.baptismalName || null, values.role || null, values.appointmentDate || null, values.affiliation || null, values.generation ? Number(values.generation) : null, values.birthDate || null, values.mobile || null, values.email || null, values.status, values.incomingDate || null, values.outgoingDate || null, id, parishId]); res.json({ message: "수녀 정보가 수정되었습니다." }); } catch (error) { next(error); } });

function historyPayload(body: Record<string, unknown>) { return { year: Number(body.year), month: Number(body.month), title: String(body.title ?? "").trim(), description: String(body.description ?? "").trim(), enabled: body.enabled === undefined ? true : Boolean(body.enabled) }; }
function historyErrors(values: ReturnType<typeof historyPayload>) { const errors: Record<string, string> = {}; if (!Number.isInteger(values.year) || values.year < 1000 || values.year > 9999) errors.year = "연도는 4자리 숫자로 입력해 주세요."; if (!Number.isInteger(values.month) || values.month < 1 || values.month > 12) errors.month = "월을 선택해 주세요."; if (!values.title) errors.title = "연혁 내용을 입력해 주세요."; else if (values.title.length > 300) errors.title = "연혁 내용은 300자 이내로 입력해 주세요."; if (values.description.length > 5000) errors.description = "부가설명은 5,000자 이내로 입력해 주세요."; return errors; }
async function historyDirection(parishId: number) { const [rows] = await pool.query<RowDataPacket[]>("SELECT sort_direction FROM parish_history_preferences WHERE parish_id = ? LIMIT 1", [parishId]); return rows[0]?.sort_direction === "asc" ? "asc" : "desc"; }
app.get("/api/parish/schedules",requireParish,async(req,res,next)=>{
  try{
    const parishId=Number(res.locals.parishSession.parish_id);
    const month=String(req.query.month??"");
    if(!/^\d{4}-\d{2}$/.test(month))return res.status(400).json({message:"조회할 월을 확인해 주세요."});
    const [rows]=await pool.query<RowDataPacket[]>("SELECT id,DATE_FORMAT(schedule_date,'%Y-%m-%d') AS scheduleDate,TIME_FORMAT(start_time,'%H:%i') AS startTime,TIME_FORMAT(end_time,'%H:%i') AS endTime,category,schedule_type AS scheduleType,title,location,content,attachment_name AS attachmentName,created_at AS createdAt FROM parish_schedules WHERE parish_id=? AND schedule_date>=CONCAT(?,'-01') AND schedule_date<DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH) ORDER BY schedule_date,start_time,id",[parishId,month,month]);
    res.json(rows.map(row=>({...row,id:Number(row.id)})));
  }catch(error){next(error)}
});
app.post("/api/parish/schedules",requireParish,async(req,res,next)=>{
  try{
    const parishId=Number(res.locals.parishSession.parish_id);
    const scheduleDate=String(req.body.scheduleDate??"");
    const startTime=String(req.body.startTime??"");
    const endTime=String(req.body.endTime??"");
    const category=String(req.body.category??"");
    const scheduleType=String(req.body.scheduleType??"").trim();
    const title=String(req.body.title??"").trim();
    const location=String(req.body.location??"").trim();
    const content=String(req.body.content??"").trim();
    const attachment=req.body.attachment&&typeof req.body.attachment==="object"?req.body.attachment as {name?:unknown;type?:unknown;data?:unknown}:null;
    const attachmentData=attachment?String(attachment.data??""):"";
    const todayKst=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
    const allowedTypes:Record<string,string[]>={mass:["주일","특전","평일","대축일","장례","위령","기원","혼인","신심","특수","성가","독서"],sacrament:["세례","견진","성체","고해","병자","성품","혼인"],devotion:["사적","공적","성체","예수 성심","성모","선인"],liturgical:[],other:[]};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)||scheduleDate<todayKst||!Object.hasOwn(allowedTypes,category)||!title||title.length>200||location.length>300||content.length>5000||(category!=="other"&&!allowedTypes[category]!.includes(scheduleType)))return res.status(400).json({message:scheduleDate<todayKst?"지난 날짜에는 일정을 등록할 수 없습니다.":"일정 구분, 종류 및 입력 내용을 확인해 주세요."});
    if((startTime&&!/^\d{2}:\d{2}$/.test(startTime))||(endTime&&!/^\d{2}:\d{2}$/.test(endTime))||(startTime&&endTime&&startTime>=endTime))return res.status(400).json({message:"일정 시간을 확인해 주세요."});
    if(attachment&&(!String(attachment.name??"").trim()||!attachmentData||Buffer.byteLength(attachmentData,"base64")>5*1024*1024))return res.status(400).json({message:"첨부파일은 5MB 이하의 파일만 등록할 수 있습니다."});
    const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_schedules (parish_id,schedule_date,start_time,end_time,category,schedule_type,title,location,content,attachment_name,attachment_type,attachment_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",[parishId,scheduleDate,startTime||null,endTime||null,category,scheduleType||null,title,location||null,content||null,attachment?String(attachment.name).trim():null,attachment?String(attachment.type||"application/octet-stream"):null,attachment?Buffer.from(attachmentData,"base64"):null]);
    const categoryLabel:Record<string,string>={mass:"미사",sacrament:"성사",devotion:"신심",liturgical:"전례력",other:"기타"};
    const broadcastMessage=[`${scheduleDate}${startTime?` ${startTime}`:""}`,`${categoryLabel[category]}${scheduleType?` · ${scheduleType}`:""}`,title,location?`장소: ${location}`:""].filter(Boolean).join(" · ");
    await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) SELECT ?,p.id,'schedule_created','새로운 성당 일정',?,'schedule',? FROM parishioners p WHERE p.parish_id=?",[parishId,broadcastMessage,result.insertId,parishId]);
    res.status(201).json({message:"일정이 등록되었습니다.",id:result.insertId});
  }catch(error){next(error)}
});
app.get("/api/parish/schedules/:id/attachment",requireParish,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT attachment_name AS name,attachment_type AS type,attachment_data AS data FROM parish_schedules WHERE id=? AND parish_id=? LIMIT 1",[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type||"application/octet-stream"));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});
app.patch("/api/parish/schedules/:id",requireParish,async(req,res,next)=>{
  try{
    const parishId=Number(res.locals.parishSession.parish_id),id=Number(req.params.id);
    const scheduleDate=String(req.body.scheduleDate??""),startTime=String(req.body.startTime??""),endTime=String(req.body.endTime??""),category=String(req.body.category??""),scheduleType=String(req.body.scheduleType??"").trim(),title=String(req.body.title??"").trim(),location=String(req.body.location??"").trim(),content=String(req.body.content??"").trim();
    const allowedTypes:Record<string,string[]>={mass:["주일","특전","평일","대축일","장례","위령","기원","혼인","신심","특수","성가","독서"],sacrament:["세례","견진","성체","고해","병자","성품","혼인"],devotion:["사적","공적","성체","예수 성심","성모","선인"],liturgical:[],other:[]};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)||!Object.hasOwn(allowedTypes,category)||!title||title.length>200||location.length>300||content.length>5000||(category!=="other"&&!allowedTypes[category]!.includes(scheduleType)))return res.status(400).json({message:"일정 구분, 종류 및 입력 내용을 확인해 주세요."});
    if((startTime&&!/^\d{2}:\d{2}$/.test(startTime))||(endTime&&!/^\d{2}:\d{2}$/.test(endTime))||(startTime&&endTime&&startTime>=endTime))return res.status(400).json({message:"일정 시간을 확인해 주세요."});
    const nowKst=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,19).replace("T"," ");
    const [current]=await pool.query<RowDataPacket[]>("SELECT id FROM parish_schedules WHERE id=? AND parish_id=? AND CONCAT(schedule_date,' ',COALESCE(start_time,'23:59:59'))>?",[id,parishId,nowKst]);
    if(!current.length)return res.status(409).json({message:"이미 시작되었거나 종료된 일정은 수정할 수 없습니다."});
    const attachment=req.body.attachment&&typeof req.body.attachment==="object"?req.body.attachment as {name?:unknown;type?:unknown;data?:unknown}:null,attachmentData=attachment?String(attachment.data??""):"";
    if(attachment&&(!String(attachment.name??"").trim()||!attachmentData||Buffer.byteLength(attachmentData,"base64")>5*1024*1024))return res.status(400).json({message:"첨부파일은 5MB 이하의 파일만 등록할 수 있습니다."});
    if(attachment)await pool.execute("UPDATE parish_schedules SET schedule_date=?,start_time=?,end_time=?,category=?,schedule_type=?,title=?,location=?,content=?,attachment_name=?,attachment_type=?,attachment_data=? WHERE id=? AND parish_id=?",[scheduleDate,startTime||null,endTime||null,category,scheduleType||null,title,location||null,content||null,String(attachment.name).trim(),String(attachment.type||"application/octet-stream"),Buffer.from(attachmentData,"base64"),id,parishId]);
    else await pool.execute("UPDATE parish_schedules SET schedule_date=?,start_time=?,end_time=?,category=?,schedule_type=?,title=?,location=?,content=? WHERE id=? AND parish_id=?",[scheduleDate,startTime||null,endTime||null,category,scheduleType||null,title,location||null,content||null,id,parishId]);
    res.json({message:"일정이 수정되었습니다."});
  }catch(error){next(error)}
});
app.post("/api/parish/schedules/import-liturgical-2026",requireParish,async(_req,res,next)=>{
  const parishId=Number(res.locals.parishSession.parish_id),connection=await pool.getConnection();
  try{
    const sourceUrl="https://gist.githubusercontent.com/search5/fffbf534fe818d099e9e242c7684e9a1/raw/catholic_2026_ical.ics";
    const response=await fetch(sourceUrl,{headers:{"User-Agent":"Paxlink-Liturgical-Calendar-Importer/1.0"}});
    if(!response.ok)throw new Error("전례력 원본 파일을 불러오지 못했습니다.");
    const raw=await response.text(),lines=raw.replace(/\r\n/g,"\n").split("\n").reduce<string[]>((result,line)=>{if(/^[ \t]/.test(line)&&result.length)result[result.length-1]+=line.slice(1);else result.push(line);return result},[]),events:Array<{title:string;date:string;description:string}>=[];
    let current:Record<string,string>|null=null;
    const decode=(value:string)=>value.replace(/\\n/gi,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\").trim();
    for(const line of lines){if(line==="BEGIN:VEVENT"){current={};continue}if(line==="END:VEVENT"&&current){const date=String(current.DTSTART??"").replace(/\D/g,"").slice(0,8);if(current.SUMMARY&&/^2026\d{4}$/.test(date))events.push({title:decode(current.SUMMARY),date:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,description:decode(current.DESCRIPTION??"")});current=null;continue}if(current){const separator=line.indexOf(":");if(separator>0){const key=line.slice(0,separator).split(";")[0]!;current[key]=line.slice(separator+1)}}}
    if(!events.length)throw new Error("전례력 일정 데이터를 찾지 못했습니다.");
    await connection.beginTransaction();let imported=0,skipped=0;
    for(const event of events){const sourceKey=`liturgical-2026:${event.date}:${crypto.createHash("sha1").update(event.title).digest("hex").slice(0,16)}`;const [result]=await connection.execute<mysql.ResultSetHeader>("INSERT IGNORE INTO parish_schedules (parish_id,schedule_date,category,title,content,source_key) VALUES (?,?,'liturgical',?,?,?)",[parishId,event.date,event.title,[event.description,"출처: 한국가톨릭 서울대교구 2026년 전례력"].filter(Boolean).join("\n"),sourceKey]);if(result.affectedRows)imported++;else skipped++}
    if(imported)await connection.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type) SELECT ?,p.id,'liturgical_calendar_import','2026년 전례력 등록',?,'schedule' FROM parishioners p WHERE p.parish_id=?",[parishId,`2026년 전례력 ${imported}건이 성당 일정에 등록되었습니다.`,parishId]);
    await connection.commit();res.json({message:`2026년 전례력 ${imported}건을 등록했습니다.${skipped?` 중복 ${skipped}건은 제외했습니다.`:""}`,imported,skipped});
  }catch(error){await connection.rollback();next(error)}finally{connection.release()}
});
app.get("/api/parish/suggestions",requireParish,async(_req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id);const [rows]=await pool.query<RowDataPacket[]>(`SELECT s.id,s.title,s.content,s.tags,s.anonymous,s.attachment_name AS attachmentName,s.status,s.decision_explanation AS decisionExplanation,s.action_content AS actionContent,s.decided_at AS decidedAt,s.created_at AS createdAt,p.name AS authorName,p.baptismal_name AS baptismalName,p.email FROM parish_suggestions s JOIN parishioners p ON p.id=s.author_id WHERE s.parish_id=? ORDER BY FIELD(s.status,'requested','approved','rejected'),s.created_at DESC`,[parishId]);res.json(rows.map(row=>({...row,id:Number(row.id),anonymous:Boolean(row.anonymous),tags:String(row.tags||'').split(',').filter(Boolean)})))}catch(error){next(error)}});
app.patch("/api/parish/suggestions/:id/decision",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),id=Number(req.params.id),status=String(req.body.status??''),explanation=String(req.body.explanation??'').trim(),actionContent=String(req.body.actionContent??'').trim();if(!['approved','rejected'].includes(status)||!explanation||explanation.length>4000||actionContent.length>10000)return res.status(400).json({message:"승인 또는 반려 결정과 설명을 입력해 주세요."});const [rows]=await pool.query<RowDataPacket[]>("SELECT author_id AS authorId,title FROM parish_suggestions WHERE id=? AND parish_id=?",[id,parishId]);if(!rows.length)return res.status(404).json({message:"제안을 찾을 수 없습니다."});await pool.execute("UPDATE parish_suggestions SET status=?,decision_explanation=?,action_content=?,decided_at=NOW() WHERE id=? AND parish_id=?",[status,explanation,actionContent||null,id,parishId]);const label=status==='approved'?'승인':'반려';await pool.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) VALUES (?,?,'suggestion_decision',?,?, 'suggestion',?)",[parishId,rows[0]!.authorId,`제안 ${label} 결과`,`'${rows[0]!.title}' 제안이 ${label}되었습니다. ${explanation}`,id]);res.json({message:`제안을 ${label} 처리했습니다.`})}catch(error){next(error)}});
app.get("/api/parish/suggestions/:id/attachment",requireParish,async(req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT attachment_name AS name,attachment_type AS type,attachment_data AS data FROM parish_suggestions WHERE id=? AND parish_id=?",[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});
app.post("/api/parish/suggestions/:id/read",requireParish,async(req,res,next)=>{try{const [result]=await pool.execute<mysql.ResultSetHeader>("UPDATE parish_suggestions SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND parish_id=?",[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!result.affectedRows)return res.status(404).json({message:"제안을 찾을 수 없습니다."});res.json({message:"읽음 처리되었습니다."})}catch(error){next(error)}});
app.get("/api/parish/history", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), direction = await historyDirection(parishId), enabledOnly = req.query.enabled === "true"; const [rows] = await pool.query<RowDataPacket[]>(`SELECT id, event_year AS year, event_month AS month, title, description, enabled, created_at, updated_at FROM parish_history WHERE parish_id = ?${enabledOnly ? " AND enabled = 1" : ""} ORDER BY event_year ${direction === "asc" ? "ASC" : "DESC"}, event_month ${direction === "asc" ? "ASC" : "DESC"}, id ${direction === "asc" ? "ASC" : "DESC"}`, [parishId]); res.json({ sortDirection: direction, items: rows.map((row) => ({ ...row, enabled: Boolean(row.enabled) })) }); } catch (error) { next(error); } });
app.put("/api/parish/history/preferences", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), direction = req.body.sortDirection === "asc" ? "asc" : "desc"; await pool.execute("INSERT INTO parish_history_preferences (parish_id, sort_direction) VALUES (?, ?) ON DUPLICATE KEY UPDATE sort_direction=VALUES(sort_direction)", [parishId, direction]); res.json({ message: "연혁 정렬 방식이 저장되었습니다.", sortDirection: direction }); } catch (error) { next(error); } });
app.post("/api/parish/history", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), values = historyPayload(req.body), errors = historyErrors(values); if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors }); const [result] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_history (parish_id, event_year, event_month, title, description, enabled) VALUES (?, ?, ?, ?, ?, ?)", [parishId, values.year, values.month, values.title, values.description || null, values.enabled]); res.status(201).json({ message: "연혁이 추가되었습니다.", id: result.insertId }); } catch (error) { next(error); } });
app.patch("/api/parish/history/:id", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), id = Number(req.params.id), values = historyPayload(req.body), errors = historyErrors(values); if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors }); const [result] = await pool.execute<mysql.ResultSetHeader>("UPDATE parish_history SET event_year=?, event_month=?, title=?, description=?, enabled=? WHERE id=? AND parish_id=?", [values.year, values.month, values.title, values.description || null, values.enabled, id, parishId]); if (!result.affectedRows) return res.status(404).json({ message: "연혁을 찾을 수 없습니다." }); res.json({ message: "연혁이 수정되었습니다." }); } catch (error) { next(error); } });
app.delete("/api/parish/history/:id", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), id = Number(req.params.id); const [result] = await pool.execute<mysql.ResultSetHeader>("DELETE FROM parish_history WHERE id = ? AND parish_id = ?", [id, parishId]); if (!result.affectedRows) return res.status(404).json({ message: "연혁을 찾을 수 없습니다." }); res.json({ message: "연혁이 삭제되었습니다." }); } catch (error) { next(error); } });

const patronSaintUrl = "https://sd.uca.or.kr/hopyeong/default?mnucd=20003275";
app.get("/api/parish/patron-saint", requireParish, async (_req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id); const [rows] = await pool.query<RowDataPacket[]>("SELECT content_html, source_url, updated_at FROM parish_patron_saint_content WHERE parish_id = ? LIMIT 1", [parishId]); res.json(rows[0] ? { contentHtml: rows[0].content_html, sourceUrl: rows[0].source_url, updatedAt: rows[0].updated_at } : { contentHtml: "", sourceUrl: patronSaintUrl, updatedAt: null }); } catch (error) { next(error); } });
app.put("/api/parish/patron-saint", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), contentHtml = String(req.body.contentHtml ?? "").trim(); if (contentHtml.length > 100_000) return res.status(400).json({ message: "주보 성인 내용은 100KB 이내로 작성해 주세요." }); await pool.execute("INSERT INTO parish_patron_saint_content (parish_id, content_html, source_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content_html=VALUES(content_html), source_url=VALUES(source_url)", [parishId, contentHtml, patronSaintUrl]); res.json({ message: "주보 성인 내용이 저장되었습니다.", sourceUrl: patronSaintUrl }); } catch (error) { next(error); } });
app.get("/api/parish/administrative-guide", requireParish, async (_req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id); const [rows] = await pool.query<RowDataPacket[]>("SELECT content_html, updated_at FROM parish_administrative_guide_content WHERE parish_id = ? LIMIT 1", [parishId]); res.json(rows[0] ? { contentHtml: rows[0].content_html, updatedAt: rows[0].updated_at } : { contentHtml: "", updatedAt: null }); } catch (error) { next(error); } });
app.put("/api/parish/administrative-guide", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), contentHtml = String(req.body.contentHtml ?? "").trim(); if (contentHtml.length > 100_000) return res.status(400).json({ message: "행정안내 내용은 100KB 이내로 작성해 주세요." }); await pool.execute("INSERT INTO parish_administrative_guide_content (parish_id, content_html) VALUES (?, ?) ON DUPLICATE KEY UPDATE content_html=VALUES(content_html)", [parishId, contentHtml]); res.json({ message: "행정안내 내용이 저장되었습니다." }); } catch (error) { next(error); } });

function youtubeVideoId(value: string) { try { const url = new URL(value); const host = url.hostname.replace(/^www\./, "").toLowerCase(); let id = ""; if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? ""; else if (host === "youtube.com" || host === "m.youtube.com") { if (url.pathname === "/watch") id = url.searchParams.get("v") ?? ""; else if (/^\/(shorts|embed)\//.test(url.pathname)) id = url.pathname.split("/")[2] ?? ""; } return /^[\w-]{11}$/.test(id) ? id : null; } catch { return null; } }
async function youtubeMetadata(value: unknown) { const source = String(value ?? "").trim(), videoId = youtubeVideoId(source); if (!videoId) throw Object.assign(new Error("올바른 YouTube 동영상 링크를 입력해 주세요."), { status: 400 }); const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`; const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`, { signal: AbortSignal.timeout(8_000) }); if (!response.ok) throw Object.assign(new Error("YouTube에서 동영상 정보를 확인할 수 없습니다."), { status: 400 }); const data = await response.json() as { title?: string; author_name?: string; thumbnail_url?: string }; if (!data.title || !data.thumbnail_url) throw Object.assign(new Error("동영상 메타데이터가 올바르지 않습니다."), { status: 400 }); return { youtubeUrl, videoId, title: data.title.slice(0, 500), authorName: String(data.author_name ?? "").slice(0, 300), thumbnailUrl: data.thumbnail_url }; }
app.post("/api/parish/videos/metadata", requireParish, async (req, res, next) => { try { res.json(await youtubeMetadata(req.body.url)); } catch (error) { next(error); } });
app.get("/api/parish/videos", requireParish, async (_req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id); const [rows] = await pool.query<RowDataPacket[]>("SELECT id, youtube_url AS youtubeUrl, video_id AS videoId, title, author_name AS authorName, thumbnail_url AS thumbnailUrl,tags, created_at AS createdAt FROM parish_videos WHERE parish_id = ? ORDER BY created_at DESC, id DESC", [parishId]); res.json(rows.map(row=>({...row,tags:String(row.tags??"").split(",").filter(Boolean)}))); } catch (error) { next(error); } });
app.post("/api/parish/videos", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), metadata = await youtubeMetadata(req.body.url),tags=[...new Set(String(req.body.tags??"").split(/[,\s]+/).map(value=>value.replace(/^#/,"").trim()).filter(Boolean))].slice(0,20);if(tags.some(tag=>tag.length>30))return res.status(400).json({message:"태그는 각각 30자 이내로 입력해 주세요."}); const [result] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_videos (parish_id, youtube_url, video_id, title, author_name, thumbnail_url,tags) VALUES (?, ?, ?, ?, ?, ?,?)", [parishId, metadata.youtubeUrl, metadata.videoId, metadata.title, metadata.authorName || null, metadata.thumbnailUrl,tags.join(",")||null]); res.status(201).json({ message: "동영상이 등록되었습니다.", id: result.insertId }); } catch (error) { if ((error as { code?: string }).code === "ER_DUP_ENTRY") return res.status(409).json({ message: "이미 등록된 동영상입니다." }); next(error); } });
app.delete("/api/parish/videos/:id", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), id = Number(req.params.id); const [result] = await pool.execute<mysql.ResultSetHeader>("DELETE FROM parish_videos WHERE id = ? AND parish_id = ?", [id, parishId]); if (!result.affectedRows) return res.status(404).json({ message: "동영상을 찾을 수 없습니다." }); res.json({ message: "동영상이 삭제되었습니다." }); } catch (error) { next(error); } });

function noticePayload(body: Record<string, unknown>) { return { title: String(body.title ?? "").trim(), content: String(body.content ?? "").trim(), pinned: Boolean(body.pinned), popupEnabled: Boolean(body.popupEnabled), popupFrom: String(body.popupFrom ?? ""), popupTo: String(body.popupTo ?? ""), attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, 2) as Array<{ name?: unknown; type?: unknown; data?: unknown; existingSlot?: unknown }> : [] }; }
function noticeErrors(value: ReturnType<typeof noticePayload>) { const errors: Record<string, string> = {}; if (!value.title) errors.title = "제목을 입력해 주세요."; else if (value.title.length > 300) errors.title = "제목은 300자 이내로 입력해 주세요."; if (!value.content) errors.content = "내용을 입력해 주세요."; if (value.content.length > 60_000) errors.content = "내용은 60,000자 이내로 입력해 주세요."; if (value.popupEnabled) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value.popupFrom)) errors.popupFrom = "팝업 시작일을 선택해 주세요."; if (!/^\d{4}-\d{2}-\d{2}$/.test(value.popupTo)) errors.popupTo = "팝업 종료일을 선택해 주세요."; if (value.popupFrom && value.popupTo && value.popupFrom > value.popupTo) errors.popupTo = "종료일은 시작일 이후여야 합니다."; } for (const file of value.attachments) { if (file.existingSlot === 1 || file.existingSlot === 2) continue; const data = String(file.data ?? ""); if (!String(file.name ?? "").trim() || !data) errors.attachments = "첨부파일 정보를 확인해 주세요."; else if (Buffer.byteLength(data, "base64") > 5 * 1024 * 1024) errors.attachments = "첨부파일은 파일당 5MB까지 업로드할 수 있습니다."; } return errors; }
function noticeDto(row: RowDataPacket) { return { id: Number(row.id), title: row.title, content: row.content, pinned: Boolean(row.pinned), popupEnabled: Boolean(row.popup_enabled), popupFrom: row.popup_from, popupTo: row.popup_to, attachments: [1, 2].flatMap((slot) => row[`attachment${slot}_name`] ? [{ slot, name: row[`attachment${slot}_name`], type: row[`attachment${slot}_type`] }] : []), createdAt: row.created_at, updatedAt: row.updated_at }; }
app.get("/api/parish/notices", requireParish, async (_req, res, next) => { try { const [rows] = await pool.query<RowDataPacket[]>("SELECT id,title,content,pinned,popup_enabled,popup_from,popup_to,attachment1_name,attachment1_type,attachment2_name,attachment2_type,created_at,updated_at FROM parish_notices WHERE parish_id=? ORDER BY pinned DESC, created_at DESC, id DESC", [Number(res.locals.parishSession.parish_id)]); res.json(rows.map(noticeDto)); } catch (error) { next(error); } });
app.get("/api/parish/notices/popups/active", requireParish, async (_req,res,next)=>{try{const [rows]=await pool.query<RowDataPacket[]>("SELECT id,title,content,pinned,popup_enabled,popup_from,popup_to,attachment1_name,attachment1_type,attachment2_name,attachment2_type,created_at,updated_at FROM parish_notices WHERE parish_id=? AND popup_enabled=1 AND CURDATE() BETWEEN popup_from AND popup_to ORDER BY pinned DESC,created_at DESC",[Number(res.locals.parishSession.parish_id)]);res.json(rows.map(noticeDto))}catch(error){next(error)}});
app.post("/api/parish/notices", requireParish, async (req, res, next) => { try { const parishId=Number(res.locals.parishSession.parish_id), value=noticePayload(req.body), errors=noticeErrors(value); if(Object.keys(errors).length)return res.status(400).json({message:"입력 내용을 확인해 주세요.",errors}); const files=value.attachments.map(file=>({name:String(file.name),type:String(file.type||"application/octet-stream"),data:Buffer.from(String(file.data),"base64")})); const [result]=await pool.execute<mysql.ResultSetHeader>("INSERT INTO parish_notices (parish_id,title,content,pinned,popup_enabled,popup_from,popup_to,attachment1_name,attachment1_type,attachment1_data,attachment2_name,attachment2_type,attachment2_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",[parishId,value.title,value.content,value.pinned,value.popupEnabled,value.popupEnabled?value.popupFrom:null,value.popupEnabled?value.popupTo:null,files[0]?.name??null,files[0]?.type??null,files[0]?.data??null,files[1]?.name??null,files[1]?.type??null,files[1]?.data??null]); res.status(201).json({message:"공지사항이 등록되었습니다.",id:result.insertId}); } catch(error){next(error)} });
app.patch("/api/parish/notices/:id", requireParish, async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),id=Number(req.params.id),value=noticePayload(req.body),errors=noticeErrors(value);if(Object.keys(errors).length)return res.status(400).json({message:"입력 내용을 확인해 주세요.",errors});const [currentRows]=await pool.query<RowDataPacket[]>("SELECT * FROM parish_notices WHERE id=? AND parish_id=? LIMIT 1",[id,parishId]);if(!currentRows.length)return res.status(404).json({message:"공지사항을 찾을 수 없습니다."});const current=currentRows[0]!,files=value.attachments.map(file=>file.existingSlot===1||file.existingSlot===2?{name:current[`attachment${file.existingSlot}_name`],type:current[`attachment${file.existingSlot}_type`],data:current[`attachment${file.existingSlot}_data`]}:{name:String(file.name),type:String(file.type||"application/octet-stream"),data:Buffer.from(String(file.data),"base64")});await pool.execute("UPDATE parish_notices SET title=?,content=?,pinned=?,popup_enabled=?,popup_from=?,popup_to=?,attachment1_name=?,attachment1_type=?,attachment1_data=?,attachment2_name=?,attachment2_type=?,attachment2_data=? WHERE id=? AND parish_id=?",[value.title,value.content,value.pinned,value.popupEnabled,value.popupEnabled?value.popupFrom:null,value.popupEnabled?value.popupTo:null,files[0]?.name??null,files[0]?.type??null,files[0]?.data??null,files[1]?.name??null,files[1]?.type??null,files[1]?.data??null,id,parishId]);res.json({message:"공지사항이 수정되었습니다."})}catch(error){next(error)}});
app.delete("/api/parish/notices/:id",requireParish,async(req,res,next)=>{try{const [result]=await pool.execute<mysql.ResultSetHeader>("DELETE FROM parish_notices WHERE id=? AND parish_id=?",[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!result.affectedRows)return res.status(404).json({message:"공지사항을 찾을 수 없습니다."});res.json({message:"공지사항이 삭제되었습니다."})}catch(error){next(error)}});
app.get("/api/parish/notices/:id/attachments/:slot",requireParish,async(req,res,next)=>{try{const slot=Number(req.params.slot);if(slot!==1&&slot!==2)return res.status(400).end();const [rows]=await pool.query<RowDataPacket[]>(`SELECT attachment${slot}_name AS name,attachment${slot}_type AS type,attachment${slot}_data AS data FROM parish_notices WHERE id=? AND parish_id=? LIMIT 1`,[Number(req.params.id),Number(res.locals.parishSession.parish_id)]);if(!rows.length||!rows[0]!.data)return res.status(404).end();res.type(String(rows[0]!.type||"application/octet-stream"));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(String(rows[0]!.name))}`);res.send(rows[0]!.data)}catch(error){next(error)}});

function shrinePayload(body: Record<string, unknown>) { const phones = Array.isArray(body.phoneNumbers) ? body.phoneNumbers : String(body.phoneNumbers ?? "").split(/[\n,]/); const notes = Array.isArray(body.notes) ? body.notes : String(body.notes ?? "").split("\n"); return { diocese: String(body.diocese ?? "").trim(), name: String(body.name ?? "").trim(), address: String(body.address ?? "").trim(), phoneNumbers: phones.map(String).map((value) => value.trim()).filter(Boolean), websiteUrl: String(body.websiteUrl ?? "").trim(), notes: notes.map(String).map((value) => value.trim()).filter(Boolean), enabled: body.enabled === undefined ? true : Boolean(body.enabled) }; }
function shrineErrors(value: ReturnType<typeof shrinePayload>) { const errors: Record<string, string> = {}; if (!value.diocese) errors.diocese = "교구를 입력해 주세요."; if (!value.name) errors.name = "성지명을 입력해 주세요."; if (value.websiteUrl && !/^https?:\/\//i.test(value.websiteUrl)) errors.websiteUrl = "홈페이지는 http:// 또는 https:// 주소로 입력해 주세요."; return errors; }
app.get("/api/parish/shrines", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), diocese = String(req.query.diocese ?? "").trim(), query = String(req.query.q ?? "").trim(), params: unknown[] = [parishId]; let where = "WHERE 1=1"; if (diocese) { where += " AND cs.diocese = ?"; params.push(diocese); } if (query) { where += " AND (cs.name LIKE ? OR cs.address LIKE ? OR JSON_SEARCH(cs.notes, 'one', ?) IS NOT NULL)"; params.push(`%${query}%`, `%${query}%`, `%${query}%`); } const [rows] = await pool.query<RowDataPacket[]>(`SELECT cs.id, cs.diocese, cs.name, cs.address, cs.phone_numbers AS phoneNumbers, cs.website_url AS websiteUrl, cs.notes, cs.enabled, cs.source_order AS sourceOrder, cs.source_url AS sourceUrl, cs.source_updated_date AS sourceUpdatedDate, cs.crawled_at AS crawledAt, COUNT(pp.id) AS pilgrimCount FROM catholic_shrines cs LEFT JOIN shrine_pilgrim_visits spv ON spv.shrine_id = cs.id LEFT JOIN parishioners pp ON pp.id = spv.parishioner_id AND pp.parish_id = ? ${where} GROUP BY cs.id ORDER BY cs.diocese, cs.source_order, cs.name`, params); const [dioceses] = await pool.query<RowDataPacket[]>("SELECT diocese, COUNT(*) AS count FROM catholic_shrines GROUP BY diocese ORDER BY MIN(source_order)"); res.json({ items: rows.map((row) => ({ ...row, pilgrimCount: Number(row.pilgrimCount), phoneNumbers: typeof row.phoneNumbers === "string" ? JSON.parse(row.phoneNumbers) : row.phoneNumbers, notes: typeof row.notes === "string" ? JSON.parse(row.notes) : row.notes, enabled: Boolean(row.enabled) })), dioceses: dioceses.map((row) => ({ name: row.diocese, count: Number(row.count) })) }); } catch (error) { next(error); } });
app.get("/api/parish/shrines/:id/pilgrims", requireParish, async (req, res, next) => { try { const parishId = Number(res.locals.parishSession.parish_id), shrineId = Number(req.params.id); if (!Number.isSafeInteger(shrineId) || shrineId < 1) return res.status(400).json({ message: "올바른 성지를 선택해 주세요." }); const [shrines] = await pool.query<RowDataPacket[]>("SELECT id, name FROM catholic_shrines WHERE id = ? LIMIT 1", [shrineId]); if (!shrines.length) return res.status(404).json({ message: "성지 정보를 찾을 수 없습니다." }); const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.id, p.name, p.baptismal_name AS baptismalName, p.mobile, p.email, spv.visited_at AS visitedAt FROM shrine_pilgrim_visits spv INNER JOIN parishioners p ON p.id = spv.parishioner_id WHERE spv.shrine_id = ? AND p.parish_id = ? ORDER BY spv.visited_at DESC, p.name`, [shrineId, parishId]); res.json({ shrine: { id: Number(shrines[0]!.id), name: shrines[0]!.name }, items: rows.map((row) => ({ ...row, id: Number(row.id) })) }); } catch (error) { next(error); } });
app.get("/api/parish/shrine-reviews",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),query=String(req.query.q??"").trim(),params:unknown[]=[parishId];let where="";if(query){where=" AND (r.title LIKE ? OR r.review_text LIKE ? OR s.name LIKE ? OR p.name LIKE ? OR p.baptismal_name LIKE ?)";params.push(...Array(5).fill(`%${query}%`))}const [rows]=await pool.query<RowDataPacket[]>(`SELECT r.id,r.review_group_id AS reviewGroupId,r.title,r.review_text AS reviewText,r.tags,r.enabled,r.created_at AS createdAt,v.id AS visitId,s.id AS shrineId,s.name AS shrineName,s.diocese,s.address,s.phone_numbers AS phoneNumbers,s.website_url AS websiteUrl,s.notes,p.id AS parishionerId,p.name AS authorName,p.baptismal_name AS baptismalName,DATE_FORMAT(v.visited_at,'%Y-%m-%d') AS visitedDate FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN catholic_shrines s ON s.id=v.shrine_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE p.parish_id=?${where} ORDER BY v.visited_at DESC,r.created_at DESC,r.id DESC`,params),grouped=new Map<string,Record<string,unknown>>();for(const row of rows){const key=String(row.reviewGroupId||`legacy-${row.id}`),imageUrl=`/api/parish/shrine-reviews/${row.id}/image`,existing=grouped.get(key);if(existing){(existing.imageUrls as string[]).push(imageUrl);continue}grouped.set(key,{...row,id:Number(row.id),shrineId:Number(row.shrineId),parishionerId:Number(row.parishionerId),enabled:Boolean(row.enabled),phoneNumbers:typeof row.phoneNumbers==='string'?JSON.parse(row.phoneNumbers):row.phoneNumbers,notes:typeof row.notes==='string'?JSON.parse(row.notes):row.notes,tags:String(row.tags||'').split(',').filter(Boolean),imageUrl,imageUrls:[imageUrl]})}res.json([...grouped.values()])}catch(error){next(error)}});
app.get("/api/parish/shrine-reviews/:id/image",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),reviewId=Number(req.params.id);const [rows]=await pool.query<RowDataPacket[]>("SELECT r.image_type AS imageType,r.image_data AS imageData FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE r.id=? AND p.parish_id=? LIMIT 1",[reviewId,parishId]);if(!rows.length)return res.status(404).end();res.type(String(rows[0]!.imageType));res.setHeader("Cache-Control","private, max-age=3600");res.send(rows[0]!.imageData)}catch(error){next(error)}});
app.patch("/api/parish/shrine-reviews/:id/status",requireParish,async(req,res,next)=>{try{const parishId=Number(res.locals.parishSession.parish_id),reviewId=Number(req.params.id),enabled=req.body.enabled===true;const [reviews]=await pool.query<RowDataPacket[]>("SELECT r.review_group_id AS reviewGroupId FROM shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id WHERE r.id=? AND p.parish_id=? LIMIT 1",[reviewId,parishId]);if(!reviews.length)return res.status(404).json({message:"순례후기를 찾을 수 없습니다."});const groupId=reviews[0]!.reviewGroupId,[result]=groupId?await pool.execute<mysql.ResultSetHeader>("UPDATE shrine_visit_photos r INNER JOIN shrine_pilgrim_visits v ON v.id=r.visit_id INNER JOIN parishioners p ON p.id=v.parishioner_id SET r.enabled=? WHERE r.review_group_id=? AND p.parish_id=?",[enabled,groupId,parishId]):await pool.execute<mysql.ResultSetHeader>("UPDATE shrine_visit_photos SET enabled=? WHERE id=?",[enabled,reviewId]);if(!result.affectedRows)return res.status(404).json({message:"순례후기를 찾을 수 없습니다."});res.json({message:enabled?"순례후기를 신도에게 노출합니다.":"순례후기를 신도에게 노출하지 않습니다."})}catch(error){next(error)}});
app.post("/api/parish/shrines", requireParish, async (req, res, next) => { try { const value = shrinePayload(req.body), errors = shrineErrors(value); if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors }); const sourceHash = crypto.createHash("sha256").update(`manual\0${value.diocese}\0${value.name}\0${Date.now()}`).digest("hex"); const [orderRows] = await pool.query<RowDataPacket[]>("SELECT COALESCE(MAX(source_order), 0) + 1 AS nextOrder FROM catholic_shrines"); const [result] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO catholic_shrines (diocese, name, address, phone_numbers, website_url, notes, enabled, source_order, source_url, source_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)", [value.diocese, value.name, value.address || null, JSON.stringify(value.phoneNumbers), value.websiteUrl || null, JSON.stringify(value.notes), value.enabled, Number(orderRows[0]!.nextOrder), sourceHash]); res.status(201).json({ message: "성지 정보가 등록되었습니다.", id: result.insertId }); } catch (error) { next(error); } });
app.patch("/api/parish/shrines/:id", requireParish, async (req, res, next) => { try { const id = Number(req.params.id), value = shrinePayload(req.body), errors = shrineErrors(value); if (Object.keys(errors).length) return res.status(400).json({ message: "입력 내용을 확인해 주세요.", errors }); const [result] = await pool.execute<mysql.ResultSetHeader>("UPDATE catholic_shrines SET diocese=?, name=?, address=?, phone_numbers=?, website_url=?, notes=?, enabled=? WHERE id=?", [value.diocese, value.name, value.address || null, JSON.stringify(value.phoneNumbers), value.websiteUrl || null, JSON.stringify(value.notes), value.enabled, id]); if (!result.affectedRows) return res.status(404).json({ message: "성지 정보를 찾을 수 없습니다." }); res.json({ message: "성지 정보가 수정되었습니다." }); } catch (error) { next(error); } });
app.delete("/api/parish/shrines/:id", requireParish, async (req, res, next) => { try { const [result] = await pool.execute<mysql.ResultSetHeader>("DELETE FROM catholic_shrines WHERE id = ?", [Number(req.params.id)]); if (!result.affectedRows) return res.status(404).json({ message: "성지 정보를 찾을 수 없습니다." }); res.json({ message: "성지 정보가 삭제되었습니다." }); } catch (error) { next(error); } });

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if ((error as { code?: string }).code === "EAUTH") {
    return res.status(503).json({
      message: "메일 발송 계정 인증에 실패했습니다. 네이버웍스 외부 앱 비밀번호 설정을 확인해 주세요.",
    });
  }
  const status = Number((error as { status?: number }).status);
  if (status >= 400 && status < 500) return res.status(status).json({ message: (error as Error).message });
  console.error(error);
  res.status(500).json({ message: "처리 중 오류가 발생했습니다." });
});

await ensureSchema();
async function closeExpiredMissions(){const connection=await pool.getConnection();try{await connection.beginTransaction();const [missions]=await connection.query<RowDataPacket[]>("SELECT id,parish_id AS parishId,title FROM sharing_missions WHERE status='approved' AND application_to<CURDATE() FOR UPDATE");for(const mission of missions){await connection.execute("UPDATE sharing_missions SET status='ended',decided_at=NOW() WHERE id=? AND status='approved'",[mission.id]);await connection.execute("INSERT INTO parishioner_notifications (parish_id,parishioner_id,category,title,message,reference_type,reference_id) SELECT ?,a.parishioner_id,'mission_ended','미션 종료',?,'mission',? FROM sharing_mission_applications a WHERE a.mission_id=? AND a.status='approved'",[mission.parishId,`'${mission.title}' 미션이 종료되었습니다. 참여해 주셔서 감사합니다.`,mission.id,mission.id])}await connection.commit();if(missions.length)console.log(`Mission closing batch completed: ${missions.length} mission(s) ended.`)}catch(error){await connection.rollback();throw error}finally{connection.release()}}
function millisecondsUntilNextMissionBatch(){const now=Date.now(),seoulNow=new Date(now+9*60*60*1000);let target=Date.UTC(seoulNow.getUTCFullYear(),seoulNow.getUTCMonth(),seoulNow.getUTCDate(),8)-9*60*60*1000;if(target<=now)target+=24*60*60*1000;return target-now}
let missionBatchInterval:NodeJS.Timeout|undefined;
const missionBatchTimeout=setTimeout(()=>{void closeExpiredMissions().catch(error=>console.error("Mission closing batch failed",error));missionBatchInterval=setInterval(()=>void closeExpiredMissions().catch(error=>console.error("Mission closing batch failed",error)),24*60*60*1000);missionBatchInterval.unref()},millisecondsUntilNextMissionBatch());
missionBatchTimeout.unref();
let sessionCleanupRunning = false;
const sessionCleanup = setInterval(async () => {
  if (sessionCleanupRunning) return;
  sessionCleanupRunning = true;
  try { await closeExpiredSessions(); }
  catch (error) { console.error("Session cleanup failed", error); }
  finally { sessionCleanupRunning = false; }
}, 60_000);
sessionCleanup.unref();
const port = Number(process.env.PORT ?? 3000);
const publicUrl = process.env.APP_URL ?? `http://localhost:${port}`;
const server = app.listen(port, () => console.log(`Paxlink listening on ${publicUrl}/parish`));
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Paxlink received ${signal}; closing server and DB pool.`);
  clearInterval(sessionCleanup);
  clearTimeout(missionBatchTimeout);
  if(missionBatchInterval)clearInterval(missionBatchInterval);
  server.close();
  try { await pool.end(); }
  finally { process.exit(0); }
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
