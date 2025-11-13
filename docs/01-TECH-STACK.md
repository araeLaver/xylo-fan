# XYLO 백엔드 기술 스택 선정

> 작성일: 2025-01-07
> 목적: K-POP 팬덤 플랫폼 백엔드 기술 스택 결정 및 근거

---

## 📋 프로젝트 요구사항 분석

### 핵심 기능
1. **소셜 로그인**: X(트위터), 향후 유튜브/인스타그램 확장
2. **유튜브 API 연동**: 채널 인증, 숏츠 조회/저장
3. **포인트/리더보드 시스템**: 실시간 랭킹, 다중 카테고리
4. **블록체인 연동**: SBT 인증, NFT 발행 (ERC-3525)
5. **이벤트/클레임 관리**: 포인트 산정, 기간별 정산
6. **프로필 관리**: 이미지 업로드, 채널 정보

### 비기능 요구사항
- **확장성**: 팬덤 규모 증가 대비 (수만~수십만 사용자)
- **실시간성**: 리더보드, 포인트 갱신
- **보안**: OAuth 인증, 지갑 연동, API 보호
- **성능**: 대량 데이터 처리 (유튜브 크롤링, 포인트 계산)

---

## 🎯 기술 스택 비교

### 백엔드 프레임워크

| 항목 | NestJS (TypeScript) | FastAPI (Python) | Go (Gin/Echo) |
|------|---------------------|------------------|---------------|
| **타입 안정성** | ⭐⭐⭐⭐⭐ (TypeScript) | ⭐⭐⭐ (Type hints) | ⭐⭐⭐⭐⭐ (정적 타입) |
| **개발 생산성** | ⭐⭐⭐⭐⭐ (데코레이터, DI) | ⭐⭐⭐⭐⭐ (간결한 문법) | ⭐⭐⭐ (verbose) |
| **블록체인 라이브러리** | ⭐⭐⭐⭐⭐ (ethers.js, web3.js) | ⭐⭐⭐ (web3.py) | ⭐⭐⭐⭐ (go-ethereum) |
| **OAuth 지원** | ⭐⭐⭐⭐⭐ (passport.js) | ⭐⭐⭐⭐ (authlib) | ⭐⭐⭐ (goth) |
| **ORM** | ⭐⭐⭐⭐⭐ (Prisma, TypeORM) | ⭐⭐⭐⭐ (SQLAlchemy) | ⭐⭐⭐ (GORM) |
| **성능** | ⭐⭐⭐⭐ (Node.js) | ⭐⭐⭐ (uvicorn) | ⭐⭐⭐⭐⭐ (네이티브) |
| **생태계** | ⭐⭐⭐⭐⭐ (npm 방대) | ⭐⭐⭐⭐⭐ (PyPI) | ⭐⭐⭐⭐ (중간) |
| **학습 곡선** | ⭐⭐⭐ (중간) | ⭐⭐⭐⭐⭐ (쉬움) | ⭐⭐ (어려움) |

### 데이터베이스

| 항목 | PostgreSQL | MySQL | MongoDB |
|------|------------|-------|---------|
| **관계형 데이터** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ (참조 약함) |
| **JSON 지원** | ⭐⭐⭐⭐⭐ (JSONB) | ⭐⭐⭐ (JSON) | ⭐⭐⭐⭐⭐ (네이티브) |
| **확장성** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **트랜잭션** | ⭐⭐⭐⭐⭐ (ACID) | ⭐⭐⭐⭐⭐ (ACID) | ⭐⭐⭐⭐ (제한적) |
| **포인트 계산** | ⭐⭐⭐⭐⭐ (집계 함수) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Koyeb 지원** | ⭐⭐⭐⭐⭐ (제공됨) | ⭐⭐⭐ | ⭐⭐⭐ |

### 캐싱/세션

| 항목 | Redis | Memcached | In-Memory |
|------|-------|-----------|-----------|
| **자료구조** | ⭐⭐⭐⭐⭐ (다양함) | ⭐⭐ (key-value) | ⭐⭐⭐ |
| **영속성** | ⭐⭐⭐⭐⭐ (AOF/RDB) | ❌ | ❌ |
| **리더보드** | ⭐⭐⭐⭐⭐ (Sorted Set) | ⭐ | ⭐⭐ |
| **Pub/Sub** | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐ |
| **성능** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ✅ 최종 선정 기술 스택

### 1. 백엔드 프레임워크: **NestJS + TypeScript**

**선정 이유**:
- ✅ **타입 안정성**: TypeScript로 런타임 에러 최소화
- ✅ **블록체인 생태계**: ethers.js 6.x (ERC-3525 지원 우수)
- ✅ **아키텍처**: 모듈화, DI, 데코레이터로 대규모 프로젝트 관리 용이
- ✅ **OAuth 통합**: Passport.js로 Twitter/Google/Instagram 손쉽게 연동
- ✅ **Prisma ORM**: 타입 안전 쿼리, 마이그레이션 자동화
- ✅ **Queue/Job**: Bull (Redis 기반) - 유튜브 크롤링, 포인트 정산에 필수

**버전**:
```json
{
  "node": "18.20.0 LTS",
  "@nestjs/core": "^11.0.0",
  "typescript": "^5.7.0"
}
```

### 2. 데이터베이스: **PostgreSQL 15**

**선정 이유**:
- ✅ **Koyeb 제공**: 이미 인프라 준비됨 (xylo 스키마 생성 완료)
- ✅ **JSONB**: 유연한 메타데이터 저장 (유튜브 비디오 정보, 이벤트 데이터)
- ✅ **트랜잭션**: 포인트 정산, 클레임 처리 시 데이터 정합성 보장
- ✅ **집계 함수**: 리더보드 계산 (SUM, RANK, PARTITION BY)
- ✅ **확장성**: 파티셔닝, 인덱싱으로 대용량 데이터 처리

**연결 정보**:
```
Host:     ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app
Database: unble
Schema:   xylo
SSL:      Required
```

### 3. ORM: **Prisma 6.x**

**선정 이유**:
- ✅ **타입 안전**: 자동 생성되는 TypeScript 타입
- ✅ **마이그레이션**: `prisma migrate` - 스키마 변경 이력 관리
- ✅ **Prisma Studio**: GUI로 데이터 확인 가능
- ✅ **성능**: Connection pooling, 쿼리 최적화

### 4. 캐싱: **Redis 7**

**선정 이유**:
- ✅ **Sorted Set**: 리더보드 실시간 업데이트 (`ZADD`, `ZRANGE`)
- ✅ **세션 저장**: JWT 블랙리스트, OAuth 토큰 임시 저장
- ✅ **Rate Limiting**: API 요청 제한 (악용 방지)
- ✅ **Bull Queue**: 백그라운드 작업 (유튜브 크롤링 스케줄링)

### 5. 블록체인 라이브러리: **ethers.js 6.x**

**선정 이유**:
- ✅ **ERC-3525 지원**: SBT (Soul-Bound Token) 표준 구현
- ✅ **타입스크립트 네이티브**: NestJS와 완벽 호환
- ✅ **지갑 연동**: MetaMask, WalletConnect 쉽게 통합
- ✅ **이벤트 리스닝**: 온체인 이벤트 감지 (NFT 발행, 전송)

### 6. 기타 핵심 라이브러리

```json
{
  "@nestjs/passport": "^11.0.0",      // OAuth 인증
  "passport-twitter": "^1.0.4",       // Twitter OAuth 1.0a
  "@nestjs/jwt": "^11.0.0",           // JWT 토큰 생성/검증
  "ioredis": "^5.4.0",                // Redis 클라이언트
  "bull": "^4.12.0",                  // Job Queue
  "axios": "^1.7.0",                  // YouTube API 호출
  "ethers": "^6.15.0",                // 블록체인 연동
  "class-validator": "^0.14.0",       // DTO 유효성 검사
  "class-transformer": "^0.5.1"       // 객체 변환
}
```

---

## 🏗️ 프로젝트 구조

```
C:\Develop\Creativehill\XYLO\
├── docs/                          # 프로젝트 문서
│   ├── 01-TECH-STACK.md          # (현재 파일)
│   ├── 02-DATABASE-SCHEMA.md     # DB 스키마 설계
│   ├── 03-API-DESIGN.md          # API 엔드포인트 설계
│   └── 04-SETUP-GUIDE.md         # 로컬 환경 설정 가이드
├── backend/                       # NestJS 백엔드 (생성 예정)
│   ├── src/
│   │   ├── auth/                 # 인증 모듈 (Twitter OAuth, JWT)
│   │   ├── users/                # 사용자 관리
│   │   ├── youtube/              # 유튜브 채널/비디오 관리
│   │   ├── points/               # 포인트 시스템
│   │   ├── leaderboard/          # 리더보드
│   │   ├── blockchain/           # SBT/NFT 관리
│   │   ├── events/               # 이벤트 참여
│   │   └── common/               # 공통 유틸리티
│   ├── prisma/
│   │   └── schema.prisma         # Prisma 스키마
│   ├── scripts/                  # 유틸리티 스크립트
│   ├── test/                     # E2E 테스트
│   ├── .env                      # 환경 변수
│   ├── package.json
│   └── tsconfig.json
├── 기능분석.txt                   # 기획 문서
├── ip_수익모델_팬덤_참여형_모델.pdf
├── 마이\ 페이지\ 화면\ 디자인.pdf
└── 위치스_리더보드_화면기획(다\ 추가).pdf
```

---

## 🚀 다음 단계

1. ✅ 기술 스택 결정 및 문서화 **(완료)**
2. 📊 데이터베이스 스키마 설계 (`02-DATABASE-SCHEMA.md`)
3. 🎨 API 엔드포인트 설계 (`03-API-DESIGN.md`)
4. 🛠️ NestJS 프로젝트 초기화
5. 🔌 Koyeb PostgreSQL 연결 설정
6. 📝 Prisma 스키마 작성 및 마이그레이션
7. 🧪 기본 모듈 구현 및 테스트

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-07
