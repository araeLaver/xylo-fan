# 리더보드 테이블 변경 사항

> 변경일: 2025-01-07
> 이유: 채널별 랭킹 기능 추가 (기능분석.txt 17번, 화면기획서 요구사항 반영)

---

## 변경 요약

**기존**: 사용자 기반 리더보드
**변경**: **채널 기반 리더보드** (사용자 정보 + 채널 정보 스냅샷)

---

## 추가된 컬럼

### 1. 채널 참조
```sql
channel_id UUID REFERENCES xylo.youtube_channels(id) ON DELETE SET NULL
```
- 리더보드에 표시될 대표 채널
- 채널 삭제 시 NULL 처리 (히스토리 보존)

### 2. 채널 정보 스냅샷
```sql
channel_title       VARCHAR(255)  -- 채널명 (스냅샷 시점)
channel_image_url   TEXT          -- 채널 이미지 URL (스냅샷 시점)
```
- 스냅샷 시점의 채널 정보 보존
- 리더보드 표시용

### 3. 사용자 정보 스냅샷
```sql
x_handle            VARCHAR(255)  -- X 핸들 (스냅샷 시점)
profile_image_url   TEXT          -- 프로필 이미지 (업로드 우선)
```
- 사용자 X 핸들 정보
- 프로필 이미지 우선순위:
  1. 사용자가 업로드한 이미지 (profile_image_url)
  2. 채널 썸네일 이미지 (channel_image_url)

---

## 추가된 인덱스

```sql
CREATE INDEX idx_leaderboard_channel ON xylo.leaderboard_entries(channel_id);
```
- 채널별 조회 성능 최적화

---

## 리더보드 표시 로직 (화면기획서 기준)

### Top3 표시
- **채널 이미지** + **채널명** 하이라이트
- 이미지 우선순위:
  1. 사용자 업로드 이미지
  2. 채널 이미지

### 리더보드 목록
- **ID**: 채널 URL (텍스트 길이 000 이후 ... 표기)
- **이미지**:
  - (A) 사용자 업로드 이미지 O → 해당 이미지 노출
  - (B) 사용자 업로드 이미지 X → 프로필상의 대표 채널 이미지

### 기간별 필터
- **ALL**: 전체 기간
- **1D**: 최근 24시간
- **1W**: 최근 1주
- **1M**: 최근 1개월
- **3M**: 최근 3개월

### 정렬
- **Highest first** (기본)
- **Lowest first**

---

## 데이터베이스 변경 결과

### 객체 통계
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 테이블 크기 | 40 kB | 56 kB |
| 인덱스 개수 | 3개 | 4개 |
| 외래키 | 1개 | 2개 |

### 외래키 제약조건
```
leaderboard_entries.user_id → users.id (ON DELETE CASCADE)
leaderboard_entries.channel_id → youtube_channels.id (ON DELETE SET NULL)  ← 신규
```

---

## 백엔드 구현 가이드

### 리더보드 스냅샷 생성 (매일 자정)

```typescript
async createLeaderboardSnapshot(period: LeaderboardPeriod) {
  // 1. 기간별 포인트 집계
  const rankings = await this.getUserRankings(period);

  // 2. 각 사용자의 대표 채널 조회
  for (const ranking of rankings) {
    const user = await prisma.user.findUnique({
      where: { id: ranking.userId },
      include: {
        youtubeChannels: {
          where: { isVerified: true },
          orderBy: { createdAt: 'asc' },
          take: 1  // 첫 번째 인증된 채널 = 대표 채널
        }
      }
    });

    const channel = user.youtubeChannels[0];

    // 3. 리더보드 엔트리 생성 (스냅샷)
    await prisma.leaderboardEntry.create({
      data: {
        userId: user.id,
        channelId: channel?.id,
        period,
        rank: ranking.rank,
        totalCurrent: ranking.totalPoints,
        contents: ranking.slot01,
        mgm: ranking.slot02,
        event: ranking.slot03,
        profit: ranking.slot04 + ranking.slot05,
        boost: ranking.slot06,

        // 채널 스냅샷
        channelTitle: channel?.channelTitle,
        channelImageUrl: channel?.thumbnailUrl,

        // 사용자 스냅샷
        xHandle: user.xHandle,
        profileImageUrl: user.profileImageUrl || channel?.thumbnailUrl,

        snapshotDate: new Date()
      }
    });
  }
}
```

### 리더보드 조회 API

```typescript
@Get('leaderboard')
async getLeaderboard(
  @Query('period') period: LeaderboardPeriod = 'ALL'
): Promise<LeaderboardEntryDto[]> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      period,
      snapshotDate: {
        gte: startOfDay(new Date())  // 최신 스냅샷만
      }
    },
    orderBy: { rank: 'asc' },
    take: 100  // Top 100
  });

  return entries.map(entry => ({
    rank: entry.rank,
    channelName: entry.channelTitle,
    channelImage: entry.profileImageUrl,  // 우선순위 적용된 이미지
    xHandle: entry.xHandle,
    totalCurrent: entry.totalCurrent,
    contents: entry.contents,
    mgm: entry.mgm,
    event: entry.event,
    profit: entry.profit,
    boost: entry.boost
  }));
}
```

---

## 마이그레이션 스크립트

```bash
# 업데이트 실행
node database/run-update.js

# 검증
node database/verify-tables.js
```

---

**변경자**: Backend Team
**검증 완료**: 2025-01-07
**다음 작업**: 리더보드 스냅샷 생성 Cron Job 구현
