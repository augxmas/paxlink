# Paxlink

성당 관리와 신도 신앙생활 서비스를 제공하는 Node.js / TypeScript 애플리케이션입니다.

## 실행

Node.js 22 이상과 MySQL 8.0을 준비합니다.

```sh
npm ci
cp .env.example .env
```

[데이터베이스 복구 안내](database/README.md)에 따라 DB를 복원한 뒤 `.env`의 DB 접속 정보와 개인정보 암호화 키를 설정합니다.

```sh
npm run build
npm start
```

기본 포트는 4500입니다. `/parish`는 성당 관리자, `/parishioner`는 신도 서비스, `/supervisor`는 전체 관리자 화면입니다. `PARISH_BASE_DOMAIN`으로 본 서비스 도메인을 지정하며 성당별 호스트와 기본 도메인의 진입 화면이 구분됩니다.

`src/`는 서버 및 클라이언트 원본, `public/`은 화면과 정적 자원, `scripts/`는 운영 도구입니다. `dist/`와 일부 브라우저 번들은 빌드로 생성합니다. 성당별 생성 페이지는 앱 시작 시 재생성합니다.

## 백업

`database/backups/2026-09-06/`에 운영 스키마와 암호화된 전체 SQL 백업을 보관합니다. 공개 저장소이므로 운영 데이터 원문, `.env`, 복구 키는 포함하지 않습니다. 복구 키는 별도 보관이 필요합니다.
