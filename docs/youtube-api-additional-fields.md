# YouTube Data API v3 - 추가 활용 가능한 필드

## 📊 현재 사용 중인 Part

```typescript
youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics'],
  id: videoIds
})
```

---

## ✅ 현재 저장 중인 데이터

### snippet (기본 정보)
- ✅ `title` - 제목
- ✅ `description` - 설명
- ✅ `thumbnails.default.url` - 기본 썸네일
- ✅ `publishedAt` - 업로드 시간
- ✅ `tags[]` - 태그 배열

### contentDetails (컨텐츠 정보)
- ✅ `duration` - 영상 길이 (PT45S)

### statistics (통계)
- ✅ `viewCount` - 조회수
- ✅ `likeCount` - 좋아요
- ✅ `commentCount` - 댓글 수

---

## 🆕 추가 활용 가능한 데이터

## 1️⃣ snippet에서 가져오지만 저장 안 하는 필드

### 📹 categoryId (카테고리)
```typescript
video.snippet.categoryId  // "10" (Music), "20" (Gaming), "24" (Entertainment)
```

**활용처**:
- 음악 Shorts vs 게임 Shorts 구분
- 카테고리별 통계 분석
- 카테고리별 리더보드

**YouTube 카테고리 ID 목록**:
| ID | 카테고리 | ID | 카테고리 |
|----|---------|----|---------||1 | Film & Animation | 20 | Gaming |
|2 | Autos & Vehicles | 22 | People & Blogs |
|10 | Music | 23 | Comedy |
|15 | Pets & Animals | 24 | Entertainment |
|17 | Sports | 25 | News & Politics |
|19 | Travel & Events | 26 | Howto & Style |
|20 | Gaming | 27 | Education |
|22 | People & Blogs | 28 | Science & Technology |

### 🌐 defaultAudioLanguage / defaultLanguage
```typescript
video.snippet.defaultAudioLanguage  // "ko", "en", "ja"
video.snippet.defaultLanguage       // "ko"
```

**활용처**:
- 언어별 필터링
- 다국어 콘텐츠 관리
- 글로벌 확장 시 유용

### 🖼️ 고해상도 썸네일
```typescript
video.snippet.thumbnails = {
  default: {
    url: "https://i.ytimg.com/vi/VIDEO_ID/default.jpg",
    width: 120,
    height: 90
  },
  medium: {
    url: "https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg",  // ⭐ 추가 가능
    width: 320,
    height: 180
  },
  high: {
    url: "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",  // ⭐ 추가 가능
    width: 480,
    height: 360
  },
  standard: {
    url: "https://i.ytimg.com/vi/VIDEO_ID/sddefault.jpg",  // ⭐ 추가 가능
    width: 640,
    height: 480
  },
  maxres: {
    url: "https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg",  // ⭐ 추가 가능
    width: 1280,
    height: 720
  }
}
```

**활용처**:
- 고해상도 썸네일로 UI 품질 향상
- 다양한 디바이스 대응 (모바일/데스크톱)
- X 포스팅 시 고품질 이미지 사용

---

## 2️⃣ contentDetails에서 가져오지만 저장 안 하는 필드

### 📺 definition (화질)
```typescript
video.contentDetails.definition  // "hd" 또는 "sd"
```

**활용처**:
- HD Shorts 필터링
- 품질 기반 랭킹
- 고품질 콘텐츠 우대 정책

### 🎬 dimension (2D/3D)
```typescript
video.contentDetails.dimension  // "2d" 또는 "3d"
```

**활용처**:
- 3D Shorts 특별 카테고리
- VR/AR 콘텐츠 관리

### 💬 caption (자막 여부)
```typescript
video.contentDetails.caption  // "true" 또는 "false"
```

**활용처**:
- 접근성 점수 계산
- 자막 있는 콘텐츠 우대
- 다국어 자막 콘텐츠 필터링

### 📜 licensedContent (라이선스 콘텐츠)
```typescript
video.contentDetails.licensedContent  // true 또는 false
```

**활용처**:
- 저작권 관리
- 라이선스 콘텐츠 구분

### 🔒 contentRating (연령 제한)
```typescript
video.contentDetails.contentRating  // { ytRating: "ytAgeRestricted" }
```

**활용처**:
- 연령 제한 콘텐츠 필터링
- 안전한 콘텐츠만 표시

---

## 3️⃣ 추가 Part - status (권장 ⭐)

```typescript
youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics', 'status'],  // ⭐ status 추가
  id: videoIds
})
```

### 🔓 privacyStatus (공개 상태)
```typescript
video.status.privacyStatus  // "public", "private", "unlisted"
```

**활용처**:
- **중요**: 비공개/미등록 영상 제외
- 공개 영상만 포인트 지급
- 공개 상태 변경 추적

### 🎥 uploadStatus (업로드 상태)
```typescript
video.status.uploadStatus  // "uploaded", "processed", "failed", "rejected", "deleted"
```

**활용처**:
- 처리 완료된 영상만 계산
- 실패/삭제된 영상 제외

### 🔗 embeddable (임베드 가능 여부)
```typescript
video.status.embeddable  // true 또는 false
```

**활용처**:
- 웹사이트 임베드 가능 여부 확인
- 공유 가능한 콘텐츠만 선별

### ©️ license (라이선스)
```typescript
video.status.license  // "youtube" 또는 "creativeCommon"
```

**활용처**:
- 크리에이티브 커먼즈 콘텐츠 우대
- 라이선스 기반 필터링

### 👶 madeForKids (어린이용 콘텐츠)
```typescript
video.status.madeForKids  // true 또는 false
```

**활용처**:
- 어린이용 콘텐츠 구분
- COPPA 준수

---

## 4️⃣ 추가 Part - topicDetails (선택)

```typescript
youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics', 'topicDetails'],
  id: videoIds
})
```

### 🏷️ topicCategories (주제 카테고리)
```typescript
video.topicDetails.topicCategories = [
  "https://en.wikipedia.org/wiki/Music",
  "https://en.wikipedia.org/wiki/Pop_music"
]
```

**활용처**:
- AI 기반 주제 분류
- 음악/게임 등 세부 장르 구분
- 관련 콘텐츠 추천

### 🎵 relevantTopicIds (관련 주제 ID)
```typescript
video.topicDetails.relevantTopicIds = [
  "/m/04rlf",  // Music
  "/m/064t9"   // Pop music
]
```

---

## 5️⃣ 추가 Part - player (선택)

```typescript
youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics', 'player'],
  id: videoIds
})
```

### 📺 embedHtml (임베드 HTML)
```typescript
video.player.embedHtml = '<iframe width="480" height="270" src="..." frameborder="0" allow="..." allowfullscreen></iframe>'
```

**활용처**:
- 웹사이트에 영상 임베드
- 미리보기 기능
- 소셜 공유 최적화

---

## 6️⃣ 추가 Part - recordingDetails (선택)

```typescript
youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics', 'recordingDetails'],
  id: videoIds
})
```

### 📍 location (촬영 위치)
```typescript
video.recordingDetails.location = {
  latitude: 37.5665,
  longitude: 126.9780,
  altitude: 100
}
video.recordingDetails.locationDescription = "Seoul, South Korea"
```

**활용처**:
- 위치 기반 콘텐츠 필터링
- 지역별 리더보드
- 여행 Shorts 특별 카테고리

### 📅 recordingDate (촬영 날짜)
```typescript
video.recordingDetails.recordingDate = "2025-01-10T15:30:00Z"
```

**활용처**:
- 이벤트 기반 콘텐츠 분류
- 시즌별 콘텐츠 관리

---

## 📊 추천 확장 방안

### 🎯 Priority 1 (강력 추천)

**status part 추가**:
```typescript
part: ['snippet', 'contentDetails', 'statistics', 'status']
```

**저장 필드**:
- ✅ `privacyStatus` - 공개 상태 (public만 포인트 지급)
- ✅ `uploadStatus` - 업로드 상태 (processed만 계산)
- ✅ `embeddable` - 임베드 가능 여부
- ✅ `license` - 라이선스 정보
- ✅ `madeForKids` - 어린이용 여부

**DB 스키마 추가**:
```sql
ALTER TABLE xylo.youtube_videos
  ADD COLUMN privacy_status VARCHAR(20),       -- 'public', 'private', 'unlisted'
  ADD COLUMN upload_status VARCHAR(20),        -- 'processed', 'failed', 'deleted'
  ADD COLUMN is_embeddable BOOLEAN,
  ADD COLUMN license VARCHAR(20),              -- 'youtube', 'creativeCommon'
  ADD COLUMN is_made_for_kids BOOLEAN;
```

### 🎯 Priority 2 (권장)

**snippet에서 추가 저장**:
- ✅ `categoryId` - 카테고리 (음악/게임 구분)
- ✅ `defaultAudioLanguage` - 언어
- ✅ `thumbnails.high.url` - 고해상도 썸네일

**contentDetails에서 추가 저장**:
- ✅ `definition` - 화질 (hd/sd)
- ✅ `caption` - 자막 여부

**DB 스키마 추가**:
```sql
ALTER TABLE xylo.youtube_videos
  ADD COLUMN category_id VARCHAR(10),
  ADD COLUMN language VARCHAR(10),
  ADD COLUMN thumbnail_high_url TEXT,
  ADD COLUMN definition VARCHAR(10),           -- 'hd', 'sd'
  ADD COLUMN has_caption BOOLEAN;
```

### 🎯 Priority 3 (선택)

**topicDetails part 추가** (주제 기반 분석 필요 시):
```typescript
part: ['snippet', 'contentDetails', 'statistics', 'status', 'topicDetails']
```

**player part 추가** (웹 임베드 필요 시):
```typescript
part: ['snippet', 'contentDetails', 'statistics', 'status', 'player']
```

---

## 💰 API Quota 비용

| Part | Quota 비용 |
|------|-----------|
| snippet | 2 units |
| contentDetails | 2 units |
| statistics | 2 units |
| **status** | **2 units** ⭐ |
| topicDetails | 2 units |
| player | 0 units |
| recordingDetails | 2 units |
| id | 0 units |

**현재 사용량**:
```
snippet + contentDetails + statistics = 6 units per video
```

**status 추가 시**:
```
snippet + contentDetails + statistics + status = 8 units per video
```

**일일 Quota 계산**:
- 기본 할당량: 10,000 units/day
- 현재: 10,000 / 6 = 1,666개 비디오/일
- status 추가: 10,000 / 8 = 1,250개 비디오/일

---

## 🎬 실제 API 응답 예시 (status part 추가)

```json
{
  "id": "dQw4w9WgXcQ",

  "snippet": {
    "publishedAt": "2025-01-10T15:30:00Z",
    "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "title": "Amazing Shorts #WITCHES",
    "description": "Check out this shorts!",
    "thumbnails": {
      "default": { "url": "...", "width": 120, "height": 90 },
      "medium": { "url": "...", "width": 320, "height": 180 },
      "high": { "url": "...", "width": 480, "height": 360 }
    },
    "tags": ["#WITCHES", "#XYLO"],
    "categoryId": "10",                        // ⭐ 음악 카테고리
    "defaultAudioLanguage": "ko"               // ⭐ 한국어
  },

  "contentDetails": {
    "duration": "PT45S",
    "dimension": "2d",                         // ⭐ 2D 영상
    "definition": "hd",                        // ⭐ HD 화질
    "caption": "false",                        // ⭐ 자막 없음
    "licensedContent": true
  },

  "statistics": {
    "viewCount": "1234567",
    "likeCount": "98765",
    "commentCount": "4321"
  },

  "status": {                                  // ⭐ 새로 추가
    "uploadStatus": "processed",               // ⭐ 처리 완료
    "privacyStatus": "public",                 // ⭐ 공개
    "license": "youtube",                      // ⭐ YouTube 라이선스
    "embeddable": true,                        // ⭐ 임베드 가능
    "publicStatsViewable": true,
    "madeForKids": false                       // ⭐ 성인 콘텐츠
  }
}
```

---

## 🚀 구현 예시 (status 추가)

### 1. API 호출 수정
```typescript
// youtube-crawl.processor.ts
const videoDetailsResponse = await this.youtube.videos.list({
  part: ['snippet', 'contentDetails', 'statistics', 'status'],  // ⭐ status 추가
  id: videoIds,
});
```

### 2. DB 저장 수정
```typescript
await this.prisma.youtube_videos.upsert({
  where: { video_id: video.id },
  create: {
    // 기존 필드...
    title: video.snippet?.title || '',
    duration,
    view_count: parseInt(video.statistics?.viewCount || '0'),

    // ⭐ 새 필드 추가
    privacy_status: video.status?.privacyStatus || 'public',
    upload_status: video.status?.uploadStatus || 'processed',
    is_embeddable: video.status?.embeddable ?? true,
    license: video.status?.license || 'youtube',
    is_made_for_kids: video.status?.madeForKids ?? false,

    category_id: video.snippet?.categoryId,
    language: video.snippet?.defaultAudioLanguage,
    thumbnail_high_url: video.snippet?.thumbnails?.high?.url,
    definition: video.contentDetails?.definition,
    has_caption: video.contentDetails?.caption === 'true',
  },
  update: {
    // 통계는 매일 업데이트
    view_count: parseInt(video.statistics?.viewCount || '0'),
    like_count: parseInt(video.statistics?.likeCount || '0'),
    comment_count: parseInt(video.statistics?.commentCount || '0'),

    // ⭐ 상태도 업데이트 (공개→비공개 전환 감지)
    privacy_status: video.status?.privacyStatus || 'public',
    upload_status: video.status?.uploadStatus || 'processed',
  },
});
```

### 3. 포인트 계산 필터링 강화
```typescript
// point-calculation.processor.ts
const eligibleVideos = await this.prisma.youtube_videos.findMany({
  where: {
    channel_id: channelId,
    is_eligible: true,                // #WITCHES or #XYLO
    privacy_status: 'public',         // ⭐ 공개 영상만
    upload_status: 'processed',       // ⭐ 처리 완료된 영상만
  },
});
```

---

## 📝 결론

### 즉시 추가 권장 (High Priority)
1. **status part** - 공개 상태, 업로드 상태 확인 필수
2. **categoryId** - 카테고리별 분석
3. **thumbnails.high** - 고품질 썸네일

### 향후 추가 고려 (Medium Priority)
4. **defaultAudioLanguage** - 다국어 지원 시
5. **definition** - HD 필터링
6. **caption** - 접근성 점수

### 특수 목적 (Low Priority)
7. **topicDetails** - AI 추천 시스템
8. **player** - 웹 임베드
9. **recordingDetails** - 위치 기반 서비스
