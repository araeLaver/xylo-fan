# YouTube Shorts 데이터 흐름 정리

## 📊 전체 프로세스

```
1. YouTube Search API → 최근 7일 비디오 목록 조회
2. YouTube Videos API → 비디오 상세 정보 조회 (배치)
3. 태그 및 duration 검증 → Shorts 여부 판단
4. youtube_videos 테이블 저장
5. youtube_video_snapshots 테이블 저장 (일별 스냅샷)
```

---

## 1️⃣ YouTube Search API 호출

### API 요청
```typescript
youtube.search.list({
  part: ['id', 'snippet'],
  channelId: 'UC...',           // 채널 ID
  type: ['video'],              // 비디오만 검색
  order: 'date',                // 최신순 정렬
  publishedAfter: '2025-01-04T00:00:00Z',  // 최근 7일
  maxResults: 50,               // 최대 50개
})
```

### API 응답 구조
```typescript
{
  data: {
    items: [
      {
        id: {
          videoId: 'dQw4w9WgXcQ'  // YouTube 비디오 ID
        },
        snippet: {
          publishedAt: '2025-01-10T15:30:00Z',
          channelId: 'UC...',
          title: '비디오 제목',
          description: '비디오 설명',
          thumbnails: {
            default: { url: 'https://...', width: 120, height: 90 },
            medium: { url: 'https://...', width: 320, height: 180 },
            high: { url: 'https://...', width: 480, height: 360 }
          },
          channelTitle: '채널 이름'
        }
      }
      // ... 최대 50개
    ]
  }
}
```

### 추출 데이터
- ✅ `videoId`: 비디오 고유 ID
- ⚠️ snippet 정보는 1단계에서는 사용 안 함 (2단계에서 상세 정보 다시 조회)

---

## 2️⃣ YouTube Videos API 호출 (상세 정보)

### API 요청
```typescript
youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics'],
  id: ['videoId1', 'videoId2', ...],  // 최대 50개 배치 조회
})
```

### API 응답 구조
```typescript
{
  data: {
    items: [
      {
        id: 'dQw4w9WgXcQ',

        // ===== snippet 파트 =====
        snippet: {
          publishedAt: '2025-01-10T15:30:00Z',
          channelId: 'UC...',
          title: '비디오 제목',
          description: '비디오 설명 전체 텍스트',
          thumbnails: {
            default: {
              url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
              width: 120,
              height: 90
            },
            medium: {
              url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
              width: 320,
              height: 180
            },
            high: {
              url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
              width: 480,
              height: 360
            }
          },
          channelTitle: '채널 이름',
          tags: [
            '#WITCHES',
            '#XYLO',
            'Shorts',
            '기타 태그'
          ],  // ⭐ 포인트 적립 조건
          categoryId: '10',
          liveBroadcastContent: 'none',
          localized: {
            title: '...',
            description: '...'
          }
        },

        // ===== contentDetails 파트 =====
        contentDetails: {
          duration: 'PT45S',  // ⭐ ISO 8601 형식 (45초)
          dimension: '2d',
          definition: 'hd',
          caption: 'false',
          licensedContent: true,
          projection: 'rectangular'
        },

        // ===== statistics 파트 =====
        statistics: {
          viewCount: '1234567',      // ⭐ 조회수 (포인트 계산)
          likeCount: '98765',        // ⭐ 좋아요 (포인트 계산)
          favoriteCount: '0',
          commentCount: '4321'       // ⭐ 댓글 수 (포인트 계산)
        }
      }
    ]
  }
}
```

---

## 3️⃣ 데이터 가공 및 검증

### Duration 파싱 (ISO 8601 → 초 단위)
```typescript
/**
 * YouTube Duration 변환
 *
 * 예시:
 * - PT30S       → 30초 (Shorts)
 * - PT1M45S     → 105초 (일반 비디오)
 * - PT10M30S    → 630초 (일반 비디오)
 * - PT1H2M10S   → 3730초 (일반 비디오)
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

// 예시
parseDuration('PT30S')      // 30
parseDuration('PT1M45S')    // 105
parseDuration('PT10M30S')   // 630
```

### Shorts 판단 로직
```typescript
const duration = parseDuration(video.contentDetails?.duration || '');
const isShorts = duration <= 60;  // ⭐ 60초 이하 = Shorts
```

### 태그 검증 (포인트 적립 조건)
```typescript
/**
 * 필수 태그 확인
 *
 * 적격 조건:
 * - #WITCHES 또는 #XYLO 포함 (대소문자 구분 안 함)
 * - 부분 매치 허용 (#witches, WITCHES, witches 모두 인정)
 */
function checkEligibility(tags: string[], requiredTags: string[]): boolean {
  const lowerTags = tags.map(t => t.toLowerCase());

  return requiredTags.some(required =>
    lowerTags.some(tag => tag.includes(required.toLowerCase()))
  );
}

// 예시
const tags = ['#WITCHES', 'Shorts', 'Music'];
const requiredTags = ['#WITCHES', '#XYLO'];

checkEligibility(tags, requiredTags);  // true
```

---

## 4️⃣ DB 저장 (youtube_videos)

### 테이블 스키마
```sql
CREATE TABLE xylo.youtube_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id       UUID NOT NULL,
  video_id         VARCHAR(255) UNIQUE NOT NULL,  -- YouTube 비디오 ID

  -- 비디오 정보
  title            VARCHAR(500),
  description      TEXT,
  thumbnail_url    TEXT,
  published_at     TIMESTAMPTZ,

  -- 성과 지표
  duration         INT,              -- 초 단위
  view_count       INT DEFAULT 0,    -- 조회수
  like_count       INT DEFAULT 0,    -- 좋아요
  comment_count    INT DEFAULT 0,    -- 댓글 수

  -- 태그 및 분류
  tags             TEXT[],           -- 배열 형태
  is_shorts        BOOLEAN DEFAULT FALSE,     -- Shorts 여부
  is_eligible      BOOLEAN DEFAULT FALSE,     -- 포인트 적립 가능 여부
  is_posted_to_x   BOOLEAN DEFAULT FALSE,     -- X 포스팅 완료 여부

  -- 타임스탬프
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Upsert 로직
```typescript
await prisma.youtube_videos.upsert({
  where: {
    video_id: 'dQw4w9WgXcQ'  // YouTube 비디오 ID (UNIQUE)
  },

  create: {
    // 신규 비디오 생성 시
    channel_id: 'uuid...',
    video_id: 'dQw4w9WgXcQ',
    title: '비디오 제목',
    description: '비디오 설명',
    thumbnail_url: 'https://i.ytimg.com/vi/.../default.jpg',
    published_at: new Date('2025-01-10T15:30:00Z'),
    duration: 45,                    // 45초
    view_count: 1234567,
    like_count: 98765,
    comment_count: 4321,
    tags: ['#WITCHES', '#XYLO'],     // PostgreSQL ARRAY
    is_shorts: true,                 // 60초 이하
    is_eligible: true,               // #WITCHES 포함
  },

  update: {
    // 기존 비디오 업데이트 (일일 크롤링)
    view_count: 1234567,             // ⭐ 증가분 확인용
    like_count: 98765,
    comment_count: 4321,
    tags: ['#WITCHES', '#XYLO'],
    is_shorts: true,
    is_eligible: true,
  },
});
```

---

## 5️⃣ 일일 스냅샷 저장 (youtube_video_snapshots)

### 테이블 스키마
```sql
CREATE TABLE xylo.youtube_video_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       UUID NOT NULL,           -- youtube_videos.id (FK)
  snapshot_date  DATE NOT NULL,           -- 스냅샷 날짜 (00:00:00)

  -- 당일 통계 (포인트 계산용)
  view_count     INT,
  like_count     INT,
  comment_count  INT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(video_id, snapshot_date)  -- 하루 1개 스냅샷
);
```

### 포인트 계산 공식
```typescript
/**
 * 일일 포인트 계산 (전날 대비 증가분)
 *
 * 공식:
 * - 조회수: 100회당 1P
 * - 좋아요: 50개당 1P
 * - 댓글: 10개당 1P
 * - 일일 최대: 1000P (영상별)
 */

// 오늘 스냅샷
const today = {
  view_count: 1234567,
  like_count: 98765,
  comment_count: 4321
};

// 어제 스냅샷
const yesterday = {
  view_count: 1230000,
  like_count: 98500,
  comment_count: 4300
};

// 증가분 계산
const viewDelta = today.view_count - yesterday.view_count;      // 4567
const likeDelta = today.like_count - yesterday.like_count;      // 265
const commentDelta = today.comment_count - yesterday.comment_count;  // 21

// 포인트 계산
const viewPoints = Math.floor(viewDelta / 100);      // 45P
const likePoints = Math.floor(likeDelta / 50);       // 5P
const commentPoints = Math.floor(commentDelta / 10); // 2P

const totalPoints = viewPoints + likePoints + commentPoints;  // 52P
const cappedPoints = Math.min(totalPoints, 1000);             // 52P (1000P 미만)
```

### Upsert 로직
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);  // 00:00:00

await prisma.youtube_video_snapshots.upsert({
  where: {
    video_id_snapshot_date: {
      video_id: 'uuid...',      // youtube_videos.id
      snapshot_date: today      // 2025-01-11 00:00:00
    }
  },

  create: {
    video_id: 'uuid...',
    snapshot_date: today,
    view_count: 1234567,
    like_count: 98765,
    comment_count: 4321,
  },

  update: {
    view_count: 1234567,        // 같은 날 여러 번 크롤링 시 최신 값으로 업데이트
    like_count: 98765,
    comment_count: 4321,
  },
});
```

---

## 📋 데이터 흐름 요약표

| 단계 | API/테이블 | 주요 데이터 | 용도 |
|------|-----------|------------|------|
| 1 | `youtube.search.list` | `videoId` (최대 50개) | 최근 7일 비디오 목록 |
| 2 | `youtube.videos.list` | `snippet`, `contentDetails`, `statistics` | 비디오 상세 정보 |
| 3 | 가공 | `duration → isShorts`, `tags → isEligible` | Shorts 판단, 적격 여부 |
| 4 | `youtube_videos` | 비디오 메타데이터 + 통계 | 비디오 마스터 데이터 |
| 5 | `youtube_video_snapshots` | 일별 조회수/좋아요/댓글 | 포인트 계산 (증가분) |

---

## 🎯 핵심 판단 기준

### ✅ Shorts 여부
```typescript
duration <= 60  // 60초 이하
```

### ✅ 포인트 적립 가능 여부 (is_eligible)
```typescript
tags.some(tag =>
  tag.toLowerCase().includes('#witches') ||
  tag.toLowerCase().includes('#xylo')
)
```

### ✅ 크롤링 대상
```typescript
// youtube-crawl.processor.ts
youtube_channels.findMany({
  where: {
    is_verified: true  // ⭐ 인증 완료된 채널만
  }
})
```

### ✅ 포인트 지급 대상
```typescript
// point-calculation.processor.ts
youtube_videos.findMany({
  where: {
    channel_id: '...',
    is_eligible: true,  // ⭐ #WITCHES 또는 #XYLO 포함
  }
})
```

---

## 🔄 일일 크롤링 스케줄

```
매일 02:00 KST - YouTube 크롤링
  ↓
매일 03:00 KST - 포인트 계산 (전날 대비 증가분)
  ↓
매일 04:00 KST - 리더보드 스냅샷 생성
```

---

## 📦 응답 데이터 예시 (실제 크롤링 결과)

### YouTube API 응답 (videos.list)
```json
{
  "kind": "youtube#videoListResponse",
  "etag": "...",
  "items": [
    {
      "kind": "youtube#video",
      "etag": "...",
      "id": "dQw4w9WgXcQ",
      "snippet": {
        "publishedAt": "2025-01-10T15:30:00Z",
        "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
        "title": "Amazing Shorts Video #WITCHES",
        "description": "Check out this amazing shorts! #WITCHES #XYLO",
        "thumbnails": {
          "default": {
            "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
            "width": 120,
            "height": 90
          },
          "medium": {
            "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
            "width": 320,
            "height": 180
          },
          "high": {
            "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            "width": 480,
            "height": 360
          }
        },
        "channelTitle": "My Channel",
        "tags": [
          "#WITCHES",
          "#XYLO",
          "Shorts",
          "Music",
          "Dance"
        ],
        "categoryId": "10",
        "liveBroadcastContent": "none",
        "localized": {
          "title": "Amazing Shorts Video #WITCHES",
          "description": "Check out this amazing shorts! #WITCHES #XYLO"
        }
      },
      "contentDetails": {
        "duration": "PT45S",
        "dimension": "2d",
        "definition": "hd",
        "caption": "false",
        "licensedContent": true,
        "projection": "rectangular"
      },
      "statistics": {
        "viewCount": "1234567",
        "likeCount": "98765",
        "favoriteCount": "0",
        "commentCount": "4321"
      }
    }
  ],
  "pageInfo": {
    "totalResults": 1,
    "resultsPerPage": 1
  }
}
```

### DB 저장 결과 (youtube_videos)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "channel_id": "660e8400-e29b-41d4-a716-446655440000",
  "video_id": "dQw4w9WgXcQ",
  "title": "Amazing Shorts Video #WITCHES",
  "description": "Check out this amazing shorts! #WITCHES #XYLO",
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
  "published_at": "2025-01-10T15:30:00.000Z",
  "duration": 45,
  "view_count": 1234567,
  "like_count": 98765,
  "comment_count": 4321,
  "tags": ["#WITCHES", "#XYLO", "Shorts", "Music", "Dance"],
  "is_shorts": true,
  "is_eligible": true,
  "is_posted_to_x": false,
  "created_at": "2025-01-11T02:15:30.000Z",
  "updated_at": "2025-01-11T02:15:30.000Z"
}
```

### DB 저장 결과 (youtube_video_snapshots)
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "snapshot_date": "2025-01-11",
  "view_count": 1234567,
  "like_count": 98765,
  "comment_count": 4321,
  "created_at": "2025-01-11T02:15:30.000Z"
}
```

---

## ⚠️ 주의사항

1. **YouTube API Quota 제한**:
   - search.list: 100 units/call
   - videos.list: 1 unit/call (배치 50개까지 가능)
   - 일일 quota: 10,000 units (기본)

2. **Duration 파싱**:
   - ISO 8601 형식만 지원 (PT1M30S)
   - 잘못된 형식은 0초로 처리

3. **태그 검증**:
   - 대소문자 구분 안 함
   - 부분 매치 허용 (#witches, WITCHES, witches 모두 OK)
   - `#WITCHES` 또는 `#XYLO` 둘 중 하나만 있어도 적격

4. **Shorts 기준**:
   - YouTube 공식 기준: 60초 이하
   - 61초부터는 일반 비디오로 분류

5. **포인트 계산**:
   - 전날 스냅샷이 없으면 포인트 미지급 (첫날 제외)
   - 증가분이 음수면 0으로 처리 (조회수 감소 무시)
   - 영상별 일일 최대 1000P 제한
