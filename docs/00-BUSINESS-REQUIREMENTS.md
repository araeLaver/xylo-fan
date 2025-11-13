# XYLO × WITCHES 비즈니스 요구사항 분석서

> 작성일: 2025-01-07
> 대상: 개발팀 전체 (백엔드, 프론트엔드, 블록체인)
> 목적: K-POP 팬덤 플랫폼 상세 요구사항 정의

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [비즈니스 모델](#2-비즈니스-모델)
3. [핵심 기능 요구사항](#3-핵심-기능-요구사항)
4. [포인트 시스템](#4-포인트-시스템)
5. [NFT 구조](#5-nft-구조)
6. [사용자 플로우](#6-사용자-플로우)
7. [UI/UX 요구사항](#7-uiux-요구사항)
8. [기술 스택](#8-기술-스택)

---

## 1. 프로젝트 개요

### 1.1 프로젝트명
**XYLO × WITCHES**: K-POP 아이돌 팬덤 기반 RWA(Real World Asset) 블록체인 플랫폼

### 1.2 사업 목적
1. **엔터사 허들 완화**: 코인 시세와 아티스트 이미지를 분리한 보상 구조형 MVP 구현
2. **XYLO 기술 증빙**: ERC-3525 기반 세그먼티드 토큰 구조(RWA 인프라) 실증
3. **파트너 확보**: 대중문화교류위원회·VC 등 실증 파트너 확보, XLT 상장 전·후 우호적 마켓 조성

### 1.3 타겟 사용자
- K-POP 아이돌 팬 (주요: WITCHES 팬덤)
- 콘텐츠 크리에이터 (유튜브 숏츠 제작자)
- Web3/블록체인에 관심있는 팬

---

## 2. 비즈니스 모델

### 2.1 핵심 가치 흐름

```
팬 활동(Web2)
  ↓
검증/스코어링
  ↓
RWA Vault (온체인 수익 금고)
  ↓
ERC-3525 기반 SBT 발행
  ↓
아티스트 IP별 슬롯 세분화
  ↓
기여도·활동내역·Vault 연계값 메타데이터 저장
  ↓
MVP 종료 후 SBT → XLT 전환 (Claim)
```

### 2.2 토큰 이코노미

#### DLT (활동별 포인트)
- **역할**: 팬의 개별 활동을 정량화하는 기초 단위
- **운영**: 실시간 누적형 포인트 (MVP 기간: 비거래형)
- **활용**: Claim 시 Vault 실물 가치 기준으로 XLT로 교환

#### ERC-3525 SBT (Soul-Bound Token)
- **역할**: DLT 데이터를 가중합산하여 산출되는 팬 종합 기여 점수
- **구조**: 세그먼티드 슬롯 구조 (SLOT-01~06)
- **특징**:
  - 비양도형(non-transferable) - 개인 활동 히스토리에 묶임
  - 각 활동유형별 DLT 값을 슬롯 단위로 저장
  - 리더보드·보상 산정 기준

#### NFT (참여 인증/등급 표시)
- **역할**: 팬의 등급, 이력, 지속참여를 증명하는 인증형 NFT
- **발행**: DLT + SBT 데이터 기반
- **활용**: 등급 배지, 커뮤니티 권한, DAO 투표권

### 2.3 수익 모델

| 수익원 | 설명 | Vault 연결 |
|--------|------|------------|
| 콘텐츠 확산 | 조회/공유/좋아요 | 간접 (트래픽 → 광고 수익) |
| 신규 팬 유입 | 추천코드 기반 | 간접 (네트워크 효과) |
| 실물 판매 | 굿즈, 티켓 판매 | 직접 (매출 수익) |
| 브랜드 협찬 | 광고, 콜라보 | 직접 (협찬 수익) |

---

## 3. 핵심 기능 요구사항

### 3.1 인증 및 계정 관리

| 번호 | 기능 | 우선순위 | 설명 |
|------|------|----------|------|
| 1 | X(트위터) OAuth 로그인 | P0 | OAuth 1.0a 기반 소셜 로그인 |
| 2 | 계정별 프로필 관리 | P0 | 프로필 사진, 채널 URL, 이메일, 지갑 연동 |
| 3 | 이메일 인증 | P1 | 6자리 코드 발송/검증 |
| 4 | 지갑 연동 (MetaMask) | P0 | SBT/NFT 발행을 위한 필수 연동 |
| 21 | 향후 확장: 유튜브/인스타그램 로그인 | P2 | 추후 연동 예정 |

### 3.2 콘텐츠 활동

| 번호 | 기능 | 우선순위 | 설명 |
|------|------|----------|------|
| 3 | X 게시글 자동 포스팅 | P0 | 로그인 성공 후 리더보드 링크 포함 게시 |
| 11-14 | 유튜브 채널 인증 | P0 | 채널 URL 입력 → 인증코드 발급 → 채널 설명란 확인 → 인증 완료 |
| 15-16 | 숏츠 컨텐츠 관리 | P0 | 매일 채널별 숏츠 조회/저장, 특정 태그 포함 필터링 |

### 3.3 포인트 및 리더보드

| 번호 | 기능 | 우선순위 | 설명 |
|------|------|----------|------|
| 4 | 계정별 리더보드 | P0 | Total, Contents, MGM, Event, Profit, Boost 기준 |
| 6-7 | 포인트 계산/산정 | P0 | 이벤트별 포인트 자동 계산, 기간별·정렬별 집계 |
| 17 | 채널별 순위 관리 | P0 | 실시간 랭킹 업데이트 (매일 00:00 UTC+9) |
| 19 | 클레임 산정 | P0 | MVP 종료 후 SBT → XLT 전환 비율 계산 |

### 3.4 블록체인 연동

| 번호 | 기능 | 우선순위 | 설명 |
|------|------|----------|------|
| 20 | SBT 인증 | P0 | User Pass (Account SBT) 발행 |
| 23 | 스마트 컨트랙트 | P0 | ERC-3525 표준 구현 |
| 23 | 포인트 토큰 배포 | P1 | XLT 토큰 ERC-20/3525 하이브리드 |

### 3.5 커뮤니티

| 번호 | 기능 | 우선순위 | 설명 |
|------|------|----------|------|
| 5 | 마이페이지 | P0 | 프로필, 포인트 내역, NFT 컬렉션 조회 |
| 8-10 | 프로필 관리 | P1 | 사진 업로드, 채널 이미지 fallback, 프로필 변경 |

---

## 4. 포인트 시스템

### 4.1 ERC-3525 슬롯 구조

| 슬롯 코드 | 활동 유형 | 데이터 출처 | 포인트 점수 | 설명 |
|-----------|-----------|-------------|-------------|------|
| **SLOT-01** | 콘텐츠 확산 | 조회·공유·좋아요 | 조회/공유/좋아요 각 1P | 팬덤 확산 지표 |
| **SLOT-02** | 신규 팬 유입 | 추천코드 전환·가입 | 추천인 2P, 피추천인 1P | 성장 기여 지표 |
| **SLOT-03** | 팬 협업 | 투표·공모 참여 | 의결 1P, 투표: 누적포인트 비례 | 커뮤니티 활동 지표 |
| **SLOT-04** | 실물 판매형 수익 | 구매/매출 | 구매 2P, 매출: 전체 순수익/누적포인트 | 실물 매출 기여 |
| **SLOT-05** | 브랜드 협찬형 | 광고수익 | 투표 참여자 대상, 전체 순수익/누적포인트 | 브랜드 기여 지표 |
| **SLOT-06** | MVP 종료 Boost | Claim 인터랙션 | **300P 추가** | 온체인 Claim 보너스 |

### 4.2 포인트 계산 공식

```
SBT 총 밸류 = Σ(SLOT-01 ~ SLOT-05)

XLT 교환 비율 = (개인 SBT 밸류 ÷ 전체 SBT 합계) × Vault 가치
```

### 4.3 추천인 인정 조건 (SLOT-02)

피추천인이 **모두** 충족 시 추천인 2P 지급:
1. 커뮤니티 가입
2. XYLO 디스코드 가입
3. 영상 1개 업로드 (해시태그 필수)

### 4.4 포인트 업데이트 주기

- **실시간**: SLOT-01, 02, 03 활동 시 즉시 반영
- **일별 정산**: 매일 00:00 UTC+9 기준 SLOT-04, 05 정산
- **최종 Claim**: MVP 종료 후 SLOT-06 300P 추가

---

## 5. NFT 구조

### 5.1 NFT 유형

| 코드 | NFT 유형 | 발행 기준 | 특징 |
|------|----------|-----------|------|
| **NFT-01** | 참여 인증형 (User Pass) | 1 DLT 이상 누적 시 자동 발행 | Account SBT, 지속 참여 증명 |
| **NFT-02** | 티어형 | 누적 포인트 기준 5단계 | 1-tier ~ 5-tier 업그레이드 가능 |
| **NFT-03** | 스페셜 리워드형 | 이벤트·굿즈 연동 한정 발행 | 공모전 당선 등 한정판 NFT |
| **NFT-04** | 커넥션형 (소각형) | DLT 소각하여 즉시 혜택 제공 | 팬미팅 참여권, 비공개 영상 접근 |

### 5.2 NFT 메타데이터

```json
{
  "tokenId": "...",
  "name": "XYLO User Pass",
  "type": "SBT",
  "tier": 1,
  "attributes": [
    {
      "trait_type": "Total Points",
      "value": 14252
    },
    {
      "trait_type": "Contents",
      "value": 7300
    },
    {
      "trait_type": "MGM",
      "value": 50
    },
    {
      "trait_type": "Event",
      "value": 4150
    },
    {
      "trait_type": "Profit",
      "value": 1000
    },
    {
      "trait_type": "Boost",
      "value": 300
    }
  ],
  "benefits": "Daily bonus +300pts on final claim"
}
```

---

## 6. 사용자 플로우

### 6.1 회원가입 플로우

```
1. Sign in 버튼 클릭
   ↓
2. "Continue with X" 선택
   ↓
3. X OAuth 승인
   ↓
4. 계정 DB 생성
   ↓
5. 가입 축하 포스트 자동 게시 (레퍼럴 링크 포함)
   ↓
6. 마이페이지로 이동
```

### 6.2 유튜브 채널 인증 플로우

```
1. Edit Profile → Channel → Youtube "Register" 클릭
   ↓
2. 채널 URL 입력
   ↓
3. 시스템이 인증코드 발급 (예: "XYLO-AB12CD34")
   ↓
4. 사용자가 자신의 유튜브 채널 설명란에 인증코드 입력
   ↓
5. "Confirm" 버튼 클릭
   ↓
6. 백엔드가 YouTube Data API v3로 채널 설명 확인
   ↓
7. 인증코드 매칭 시 인증 완료
   ↓
8. 채널 정보 저장 (채널명, 로고, 구독자 수)
```

### 6.3 포인트 획득 플로우

```
[콘텐츠 확산 - SLOT-01]
1. 사용자가 X에 위치스 해시태그 포함 게시
   ↓
2. 24시간 후 조회수/좋아요/공유 수 집계
   ↓
3. 각 항목당 1P씩 자동 지급
   ↓
4. Point History에 기록

[레퍼럴 - SLOT-02]
1. 친구가 레퍼럴 링크로 가입
   ↓
2. 피추천인이 3가지 조건 완료 모니터링
   ↓
3. 조건 충족 시:
   - 추천인 +2P
   - 피추천인 +1P
   ↓
4. Point History에 기록
```

### 6.4 NFT Claim 플로우

```
1. "Claim User Pass" 버튼 클릭
   ↓
2. "Connect your wallet" 팝업
   ↓
3. MetaMask 연동 (지갑 서명)
   ↓
4. 스마트 컨트랙트 호출: mintSBT(userAddress, sbtMetadata)
   ↓
5. 가스비 $0.05 지불
   ↓
6. NFT-01 (User Pass) 발행 완료
   ↓
7. 마이페이지 NFT 섹션에 표시
```

---

## 7. UI/UX 요구사항

### 7.1 Leaderboard 화면

**필수 요소**:
- Top 3 채널 하이라이트 (프로필 이미지 + 채널명)
- 정렬 옵션: "Highest first" / "Lowest first"
- 기간 필터: ALL | 1D | 1W | 1M | 3M
- 테이블 컬럼: ID, Total Current, Contents, MGM, Event, Profit, Boost
- 페이지네이션: Top 10 기준, 5개 페이지 번호 노출

### 7.2 My Page 화면

**구성 섹션**:
1. **프로필 영역**:
   - 프로필 이미지 (업로드 가능)
   - 채널명 + 핸들
   - 가입일
   - 지갑/이메일 연결 상태 표시

2. **Referral Link**:
   - 디스코드 가입 안내
   - Generate 버튼 (가입 후 활성화)
   - Copy 버튼

3. **Activity Points**:
   - Total 포인트 (큰 숫자)
   - Activity / Referral 구분 표시
   - Info 아이콘 클릭 시 상세 팝업

4. **User Pass Claim**:
   - 미발행 시: 혜택 안내 + "Claim User Pass" 버튼
   - 발행 완료 시: NFT 카드 표시

5. **Point History**:
   - 테이블: #, DATE, DAY TOTAL, CONTENTS, REFERRAL, EVENT, PROFIT, BOOST
   - 정렬: Latest / Oldest
   - 업데이트 주기 안내: "매일 00:00 UTC+9"

### 7.3 Edit Profile 팝업

**필드**:
- NAME: 텍스트 입력
- CHANNEL:
  - Youtube: "Register" (미등록) → "Connect" (등록 후)
  - X: "@handle" 표시 (연동됨)
  - Instagram: "Coming soon..."
  - Discord: "Coming soon..."
- EMAIL: "Connect your email" → 인증 플로우
- WALLET: "Connect your wallet" → MetaMask 연동

### 7.4 NFT 노출 영역

**카드 UI**:
- 5초 자동 롤링 (마우스 호버 시 정지)
- 화살표 버튼으로 수동 이동
- 로딩바 표시

**NFT별 액션**:
- NFT-01 (User Pass): 혜택 텍스트 표시
- NFT-02 (Tier): "Upgrade" 버튼 (조건 충족 시 활성화)
- NFT-03 (Reward): 이벤트 참여 내역 표시
- NFT-04 (Connection): "Use" 버튼 (소각 실행)

---

## 8. 기술 스택

### 8.1 확정된 기술

| 레이어 | 기술 | 버전 |
|--------|------|------|
| 백엔드 프레임워크 | NestJS | 11.x |
| 언어 | TypeScript | 5.7.x |
| 데이터베이스 | PostgreSQL | 15 (Koyeb) |
| ORM | Prisma | 6.x |
| 캐싱 | Redis | 7 |
| 블록체인 | ethers.js | 6.x |
| 인증 | Passport.js | - |

### 8.2 외부 API

| 서비스 | API | 용도 |
|--------|-----|------|
| X (Twitter) | OAuth 1.0a | 소셜 로그인, 자동 포스팅 |
| YouTube | Data API v3 | 채널 인증, 숏츠 조회 |
| MetaMask | WalletConnect | 지갑 연동 |

### 8.3 스마트 컨트랙트

- **표준**: ERC-3525 (Semi-Fungible Token)
- **네트워크**: Polygon Mumbai Testnet (개발), Polygon Mainnet (프로덕션)
- **계약**:
  - `SBTContract.sol`: User Pass (Account SBT) 발행
  - `NFTContract.sol`: 티어/리워드/커넥션 NFT 발행
  - `VaultContract.sol`: RWA 수익 금고 관리
  - `XLTToken.sol`: XLT 토큰 (ERC-20 + 3525 하이브리드)

---

## 9. 데이터 모델 (개요)

### 9.1 핵심 엔티티

1. **User** (사용자)
   - id, xHandle, email, walletAddress, profileImage, joinedAt

2. **SocialAccount** (소셜 계정)
   - id, userId, platform (X/Youtube/Instagram/Discord), accountId, handle, isVerified

3. **YouTubeChannel** (유튜브 채널)
   - id, userId, channelId, channelUrl, verificationCode, isVerified, subscribers

4. **UserPoint** (사용자 포인트)
   - id, userId, totalPoints, contentPoints, mgmPoints, eventPoints, profitPoints, boostPoints

5. **PointHistory** (포인트 내역)
   - id, userId, date, dayTotal, contents, referral, event, profit, boost

6. **LeaderboardEntry** (리더보드)
   - id, userId, rank, totalCurrent, contents, mgm, event, profit, boost, period

7. **UserNFT** (사용자 NFT)
   - id, userId, nftType (SBT/Tier/Reward/Connection), tokenId, contractAddress, metadata

8. **Referral** (추천)
   - id, referrerId, refereeId, referralCode, isCompleted, completedAt

---

## 10. 마일스톤

### Phase 1: MVP 개발 (2개월)
- [ ] NestJS 프로젝트 초기화
- [ ] Koyeb PostgreSQL 연결 및 Prisma 스키마 작성
- [ ] X OAuth 로그인 구현
- [ ] 유튜브 채널 인증 구현
- [ ] 포인트 시스템 (SLOT-01~05) 구현
- [ ] 리더보드 API 구현
- [ ] User Pass (SBT) 스마트 컨트랙트 배포
- [ ] 프론트엔드 주요 화면 구현

### Phase 2: 테스트 및 최적화 (1개월)
- [ ] 통합 테스트
- [ ] 성능 최적화 (캐싱, 쿼리 최적화)
- [ ] 보안 감사
- [ ] 베타 테스터 모집 (50명)

### Phase 3: 정식 런칭 (1개월)
- [ ] 메인넷 배포
- [ ] 마케팅 캠페인
- [ ] 커뮤니티 운영
- [ ] XLT Claim 기능 개발

---

## 11. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| YouTube API 할당량 초과 | 높음 | 캐싱 전략, 배치 처리, API 키 로테이션 |
| 가스비 부담 | 중간 | Polygon L2 사용, 배치 민팅 |
| 스팸/어뷰징 | 높음 | 추천인 조건 강화, Rate Limiting |
| 법적 리스크 (증권성) | 높음 | SBT 비양도형, 법무 검토 |

---

## 12. 참고 자료

- [ERC-3525 표준 문서](https://eips.ethereum.org/EIPS/eip-3525)
- [Unlock Protocol](https://unlock-protocol.com/) - 멤버십 NFT 참고
- [Galaxis](https://galaxis.xyz/) - 활동 기반 등급 구조 참고
- [YouTube Data API v3 문서](https://developers.google.com/youtube/v3)
- [Twitter OAuth 1.0a 문서](https://developer.twitter.com/en/docs/authentication/oauth-1-0a)

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
