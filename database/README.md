# 데이터베이스 백업 및 복구

## 포함된 파일

- `backups/2026-09-06/schema.sql`: 테이블, 인덱스, 뷰, 함수 등의 스키마 SQL. 데이터는 포함하지 않습니다.
- `backups/2026-09-06/data.sql.gz.enc`: 스키마와 전체 데이터를 함께 담은 SQL을 gzip 압축하고 AES-256-GCM으로 암호화한 파일입니다.
- `backups/2026-09-06/manifest.json`: 백업 시각, SHA-256, 테이블별 행 수와 실제 복원 검증 결과입니다.

이 백업은 2026-09-06 19:06 KST 시점의 스냅샷입니다. 임시 MySQL DB에 복원하여 78개 테이블의 행 수, 뷰 1개, 함수 2개 및 신도 개인정보 복호화를 확인했습니다. 이후 운영 변경은 새 백업을 만들어야 반영됩니다.

복구 키 JSON에는 백업 암호화 키와 기존 `PERSONAL_DATA_ENCRYPTION_KEY`가 들어 있습니다. 키는 저장소 외부의 안전한 장소에 별도로 보관해야 합니다. GitHub 파일만으로 운영 데이터를 복호화할 수 없습니다.

## 전체 복구

아래 명령은 Ubuntu 셸 기준입니다. MySQL 8.0과 Node.js 22 이상을 사용합니다. **덤프에는 DROP TABLE 문이 있으므로 운영 DB가 아닌 새 빈 DB에 복원합니다.** 함수와 뷰를 생성할 수 있는 DB 관리자 계정으로 실행합니다.

```sh
npm ci
node scripts/decrypt-database-backup.mjs database/backups/2026-09-06 /secure/paxlink-2026-09-06.key.json .private-backups/paxlink.sql
mysql -u root -p -e "CREATE DATABASE paxlink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p paxlink < .private-backups/paxlink.sql
mysql -u root -p paxlink < database/post-restore.sql
```

마지막 SQL은 복원된 로그인 세션과 인증코드를 만료시켜 새로 로그인하게 합니다. 서비스 콘텐츠는 삭제하지 않습니다. 데이터가 필요 없는 개발 환경은 전체 덤프 대신 `schema.sql`만 복원할 수 있습니다.

앱용 DB 계정을 별도로 만들고 복원한 DB에 필요한 권한을 부여합니다. `.env.example`을 `.env`로 복사한 뒤 다음을 설정합니다.

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` 및 `DATABASE_URL`: 새 환경의 DB 정보.
- `PERSONAL_DATA_ENCRYPTION_KEY`: 별도 키 JSON의 `personalDataEncryptionKey` 값 그대로. 새 키를 만들면 기존 개인정보를 읽을 수 없습니다.
- `SUPERVISOR_USERNAME`, `SUPERVISOR_PASSWORD`, `SUPERVISOR_EMAIL`, `SUPERVISOR_SESSION_SECRET`: 새 환경의 관리자 설정.
- `APP_URL`, `PARISH_BASE_DOMAIN`, `PORT`: 새 환경의 주소.
- 메일 설정: 최초 점검은 `EMAIL_DELIVERY_MODE=mock`을 사용하고 실제 발송은 새 환경 SMTP 설정 후 활성화합니다.

```sh
npm run build
npm start
```

`.env`, 서버 서비스 설정, Apache/ngrok 설정, TLS 인증서와 개인 키는 백업에 포함되지 않습니다. 도메인과 HTTPS는 새 서버에 별도 구성합니다. 복호화한 SQL과 복구 키는 Git에 추가하지 않습니다.

## 새 백업 만들기

운영 앱 디렉터리에서 MySQL 8.0 클라이언트와 npm 의존성을 설치한 상태로 실행합니다. `--verify`는 임시 DB 생성/삭제 권한이 필요합니다. 비밀번호를 명령행에 직접 쓰지 않습니다.

```sh
read -s -p 'Database password: ' MYSQL_PWD
export MYSQL_PWD
MYSQL_USER=root node scripts/backup-database.mjs --out database/backups/YYYY-MM-DD --key-file .private-backups/paxlink-YYYY-MM-DD.key.json --verify
unset MYSQL_PWD
```

기존 파일은 덮어쓰지 않습니다. 새 날짜/경로를 사용하고 백업 폴더만 커밋합니다. 운영 데이터는 메모리에서 덤프하고 암호화하여 기록합니다. 기본 최대 덤프 크기는 256 MiB이며 더 큰 DB에는 별도 스트리밍 백업 절차가 필요합니다.
