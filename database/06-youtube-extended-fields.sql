-- ================================================
-- Migration 06: YouTube 비디오 확장 필드 추가
-- ================================================
-- 작성일: 2025-01-11
-- 목적:
--   1. YouTube API에서 제공하는 추가 필드 저장
--   2. status part 추가 (공개 상태, 업로드 상태 등)
--   3. snippet, contentDetails에서 현재 안 받는 필드 추가
-- ================================================

-- ================================================
-- 1. snippet 파트 - 추가 필드
-- ================================================

-- 카테고리 ID (10=음악, 20=게임, 24=엔터테인먼트 등)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(10);

-- 언어 정보
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS default_language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS default_audio_language VARCHAR(10);

-- 고해상도 썸네일 (현재 default만 저장, medium/high/maxres 추가)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS thumbnail_medium_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_high_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_standard_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_maxres_url TEXT;

-- 채널 제목 (비정규화, 빠른 조회용)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS channel_title VARCHAR(255);

-- 라이브 방송 여부
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS live_broadcast_content VARCHAR(20);

COMMENT ON COLUMN xylo.youtube_videos.category_id IS 'YouTube 카테고리 ID (10=음악, 20=게임, 24=엔터테인먼트)';
COMMENT ON COLUMN xylo.youtube_videos.default_language IS '기본 언어 (ko, en, ja 등)';
COMMENT ON COLUMN xylo.youtube_videos.default_audio_language IS '오디오 언어 (ko, en, ja 등)';
COMMENT ON COLUMN xylo.youtube_videos.live_broadcast_content IS '라이브 방송 상태 (none, upcoming, live, completed)';

-- ================================================
-- 2. contentDetails 파트 - 추가 필드
-- ================================================

-- 화질 (hd/sd)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS definition VARCHAR(10);

-- 2D/3D
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS dimension VARCHAR(10);

-- 자막 여부
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS has_caption BOOLEAN DEFAULT FALSE;

-- 라이선스 콘텐츠 여부
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS is_licensed_content BOOLEAN DEFAULT FALSE;

-- 영상 투영 방식
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS projection VARCHAR(20);

COMMENT ON COLUMN xylo.youtube_videos.definition IS '화질 (hd, sd)';
COMMENT ON COLUMN xylo.youtube_videos.dimension IS '차원 (2d, 3d)';
COMMENT ON COLUMN xylo.youtube_videos.has_caption IS '자막 포함 여부';
COMMENT ON COLUMN xylo.youtube_videos.is_licensed_content IS '라이선스 콘텐츠 여부';
COMMENT ON COLUMN xylo.youtube_videos.projection IS '영상 투영 방식 (rectangular, 360)';

-- ================================================
-- 3. status 파트 - 신규 추가 (우선순위 1)
-- ================================================

-- 공개 상태 (public, private, unlisted)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS privacy_status VARCHAR(20);

-- 업로드 상태 (processed, uploaded, failed, rejected, deleted)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS upload_status VARCHAR(20);

-- 임베드 가능 여부
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS is_embeddable BOOLEAN DEFAULT TRUE;

-- 라이선스 (youtube, creativeCommon)
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS license VARCHAR(20);

-- 어린이용 콘텐츠 여부
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS is_made_for_kids BOOLEAN DEFAULT FALSE;

-- 공개 통계 표시 여부
ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS is_public_stats_viewable BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN xylo.youtube_videos.privacy_status IS '공개 상태 (public, private, unlisted) - 포인트 지급 필터링용';
COMMENT ON COLUMN xylo.youtube_videos.upload_status IS '업로드 처리 상태 (processed, uploaded, failed, rejected, deleted)';
COMMENT ON COLUMN xylo.youtube_videos.is_embeddable IS '웹사이트 임베드 가능 여부';
COMMENT ON COLUMN xylo.youtube_videos.license IS '라이선스 (youtube, creativeCommon)';
COMMENT ON COLUMN xylo.youtube_videos.is_made_for_kids IS 'COPPA 어린이용 콘텐츠 여부';
COMMENT ON COLUMN xylo.youtube_videos.is_public_stats_viewable IS '공개 통계 표시 여부';

-- ================================================
-- 4. 인덱스 추가
-- ================================================

-- 카테고리별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_youtube_videos_category_id
  ON xylo.youtube_videos(category_id);

-- 공개 상태 필터링 최적화 (포인트 계산 시 중요)
CREATE INDEX IF NOT EXISTS idx_youtube_videos_privacy_status
  ON xylo.youtube_videos(privacy_status);

-- 업로드 상태 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_youtube_videos_upload_status
  ON xylo.youtube_videos(upload_status);

-- 복합 인덱스: 포인트 적립 대상 비디오 빠른 조회
CREATE INDEX IF NOT EXISTS idx_youtube_videos_eligible_public
  ON xylo.youtube_videos(channel_id, is_eligible, privacy_status, upload_status)
  WHERE is_eligible = TRUE AND privacy_status = 'public' AND upload_status = 'processed';

-- 언어별 필터링
CREATE INDEX IF NOT EXISTS idx_youtube_videos_language
  ON xylo.youtube_videos(default_audio_language)
  WHERE default_audio_language IS NOT NULL;

-- HD 비디오 필터링
CREATE INDEX IF NOT EXISTS idx_youtube_videos_definition
  ON xylo.youtube_videos(definition)
  WHERE definition = 'hd';

-- ================================================
-- 5. 기존 데이터 기본값 설정
-- ================================================

-- 기존 비디오는 public으로 간주 (이미 크롤링된 것들)
UPDATE xylo.youtube_videos
SET privacy_status = 'public'
WHERE privacy_status IS NULL;

-- 기존 비디오는 processed로 간주
UPDATE xylo.youtube_videos
SET upload_status = 'processed'
WHERE upload_status IS NULL;

-- 기존 비디오는 임베드 가능으로 간주
UPDATE xylo.youtube_videos
SET is_embeddable = TRUE
WHERE is_embeddable IS NULL;

-- 기존 비디오는 YouTube 라이선스로 간주
UPDATE xylo.youtube_videos
SET license = 'youtube'
WHERE license IS NULL;

-- ================================================
-- 6. 데이터 무결성 제약조건
-- ================================================

-- privacy_status는 특정 값만 허용
ALTER TABLE xylo.youtube_videos
  ADD CONSTRAINT chk_privacy_status
  CHECK (privacy_status IN ('public', 'private', 'unlisted') OR privacy_status IS NULL);

-- upload_status는 특정 값만 허용
ALTER TABLE xylo.youtube_videos
  ADD CONSTRAINT chk_upload_status
  CHECK (upload_status IN ('processed', 'uploaded', 'failed', 'rejected', 'deleted') OR upload_status IS NULL);

-- definition은 hd 또는 sd
ALTER TABLE xylo.youtube_videos
  ADD CONSTRAINT chk_definition
  CHECK (definition IN ('hd', 'sd') OR definition IS NULL);

-- dimension은 2d 또는 3d
ALTER TABLE xylo.youtube_videos
  ADD CONSTRAINT chk_dimension
  CHECK (dimension IN ('2d', '3d') OR dimension IS NULL);

-- license는 youtube 또는 creativeCommon
ALTER TABLE xylo.youtube_videos
  ADD CONSTRAINT chk_license
  CHECK (license IN ('youtube', 'creativeCommon') OR license IS NULL);

-- ================================================
-- 7. 뷰 생성: 포인트 적립 가능한 비디오만
-- ================================================

-- 기존 뷰가 있으면 삭제
DROP VIEW IF EXISTS xylo.v_eligible_videos;

-- 포인트 적립 가능 비디오 뷰 생성
CREATE VIEW xylo.v_eligible_videos AS
SELECT
  v.*,
  c.channel_title AS verified_channel_title,
  c.user_id
FROM xylo.youtube_videos v
INNER JOIN xylo.youtube_channels c ON v.channel_id = c.id
WHERE
  v.is_eligible = TRUE                    -- #WITCHES 또는 #XYLO 포함
  AND v.privacy_status = 'public'         -- 공개 영상만
  AND v.upload_status = 'processed'       -- 처리 완료된 영상만
  AND c.is_verified = TRUE;               -- 인증된 채널만

COMMENT ON VIEW xylo.v_eligible_videos IS '포인트 적립 가능한 비디오 목록 (공개 + 처리 완료 + 적격 태그 + 인증 채널)';

-- ================================================
-- 8. 유틸리티 함수: 카테고리 이름 조회
-- ================================================

CREATE OR REPLACE FUNCTION xylo.get_youtube_category_name(category_id VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE category_id
    WHEN '1' THEN 'Film & Animation'
    WHEN '2' THEN 'Autos & Vehicles'
    WHEN '10' THEN 'Music'
    WHEN '15' THEN 'Pets & Animals'
    WHEN '17' THEN 'Sports'
    WHEN '19' THEN 'Travel & Events'
    WHEN '20' THEN 'Gaming'
    WHEN '22' THEN 'People & Blogs'
    WHEN '23' THEN 'Comedy'
    WHEN '24' THEN 'Entertainment'
    WHEN '25' THEN 'News & Politics'
    WHEN '26' THEN 'Howto & Style'
    WHEN '27' THEN 'Education'
    WHEN '28' THEN 'Science & Technology'
    ELSE 'Unknown'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION xylo.get_youtube_category_name IS 'YouTube 카테고리 ID를 이름으로 변환';

-- ================================================
-- 마이그레이션 완료
-- ================================================

-- 마이그레이션 정보 기록
INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_06_applied',
  jsonb_build_object(
    'version', '06',
    'applied_at', NOW(),
    'description', 'YouTube extended fields (status, category, language, thumbnails, etc.)'
  ),
  'Migration 06: YouTube extended fields',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 06 completed successfully!';
  RAISE NOTICE '   - Added status fields (privacy_status, upload_status, embeddable, license, madeForKids)';
  RAISE NOTICE '   - Added snippet fields (category_id, language, high-res thumbnails)';
  RAISE NOTICE '   - Added contentDetails fields (definition, dimension, caption, licensedContent)';
  RAISE NOTICE '   - Created indexes for performance';
  RAISE NOTICE '   - Created v_eligible_videos view';
  RAISE NOTICE '   - Created get_youtube_category_name() function';
END $$;
