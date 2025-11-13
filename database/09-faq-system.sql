-- ================================================
-- Migration 09: FAQ 시스템
-- ================================================
-- 작성일: 2025-01-11
-- 목적:
--   1. 자주 묻는 질문 (FAQ) 시스템
--   2. 다국어 지원 (한국어/영어)
--   3. Full-Text Search (PostgreSQL)
--   4. 카테고리 분류 및 정렬
-- ================================================

-- ================================================
-- 1. FAQ 테이블 생성
-- ================================================

CREATE TABLE IF NOT EXISTS xylo.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 다국어 컨텐츠
    question_ko TEXT NOT NULL,
    question_en TEXT NOT NULL,
    answer_ko TEXT NOT NULL,
    answer_en TEXT NOT NULL,

    -- 분류
    category VARCHAR(50) DEFAULT 'General',
    order_index INTEGER DEFAULT 0,

    -- 공개 여부
    is_published BOOLEAN DEFAULT TRUE,

    -- 메타데이터
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- 2. 인덱스 생성
-- ================================================

-- 카테고리별 조회
CREATE INDEX IF NOT EXISTS idx_faqs_category ON xylo.faqs(category);

-- 공개 상태 필터링
CREATE INDEX IF NOT EXISTS idx_faqs_published ON xylo.faqs(is_published);

-- 정렬 순서
CREATE INDEX IF NOT EXISTS idx_faqs_order ON xylo.faqs(order_index);

-- 상단 고정 + 정렬
CREATE INDEX IF NOT EXISTS idx_faqs_pinned ON xylo.faqs(is_pinned, order_index);

-- Full-Text Search 인덱스 (한국어)
CREATE INDEX IF NOT EXISTS idx_faqs_search_ko
    ON xylo.faqs
    USING GIN (to_tsvector('simple', question_ko || ' ' || answer_ko));

-- Full-Text Search 인덱스 (영어)
CREATE INDEX IF NOT EXISTS idx_faqs_search_en
    ON xylo.faqs
    USING GIN (to_tsvector('english', question_en || ' ' || answer_en));

-- ================================================
-- 3. 코멘트
-- ================================================

COMMENT ON TABLE xylo.faqs IS 'FAQ (자주 묻는 질문) 테이블';
COMMENT ON COLUMN xylo.faqs.category IS '카테고리 (General, Points, NFT, Referral, Technical)';
COMMENT ON COLUMN xylo.faqs.order_index IS '정렬 순서 (작을수록 상단)';
COMMENT ON COLUMN xylo.faqs.is_pinned IS '상단 고정 여부';
COMMENT ON COLUMN xylo.faqs.view_count IS '조회수';

-- ================================================
-- 4. 초기 데이터 (샘플)
-- ================================================

INSERT INTO xylo.faqs (question_ko, question_en, answer_ko, answer_en, category, order_index, is_pinned) VALUES
('XYLO Fans는 무엇인가요?',
 'What is XYLO Fans?',
 'XYLO Fans는 위치스 커뮤니티 멤버들이 활동으로 포인트를 적립하고 XLT 토큰으로 교환할 수 있는 Web3 플랫폼입니다. YouTube 영상 업로드, 추천인 초대, 이벤트 참여 등을 통해 포인트를 획득하세요!',
 'XYLO Fans is a Web3 platform where WITCHES community members can earn points through activities and exchange them for XLT tokens. Earn points by uploading YouTube videos, inviting referrals, and participating in events!',
 'General', 1, TRUE),

('포인트는 어떻게 적립하나요?',
 'How do I earn points?',
 'YouTube에 #WITCHES 또는 #XYLO 태그가 포함된 영상을 업로드하면 조회수, 좋아요, 댓글 수에 따라 포인트가 자동으로 적립됩니다. (조회수 100회당 1P, 좋아요 50개당 1P, 댓글 10개당 1P)',
 'Upload videos with #WITCHES or #XYLO tags on YouTube. Points are automatically earned based on views (100 views = 1P), likes (50 likes = 1P), and comments (10 comments = 1P).',
 'Points', 2, FALSE),

('User Pass NFT는 무엇인가요?',
 'What is the User Pass NFT?',
 'User Pass는 XYLO 커뮤니티 멤버임을 증명하는 SBT(Soul-Bound Token)입니다. 첫 X 포스팅 또는 YouTube 채널 인증 후 자동으로 클레임할 수 있으며, 양도할 수 없는 회원증 NFT입니다.',
 'User Pass is an SBT (Soul-Bound Token) proving your XYLO community membership. It can be claimed automatically after your first X post or YouTube channel verification, and is a non-transferable membership NFT.',
 'NFT', 3, FALSE),

('추천인 시스템은 어떻게 작동하나요?',
 'How does the referral system work?',
 '추천링크를 친구에게 공유하고, 친구가 3단계를 완료하면 보너스 포인트를 획득합니다. 1단계: 가입 (+100P), 2단계: 디스코드 참여 (+200P), 3단계: 영상 업로드 (+300P). 총 600P를 획득할 수 있습니다!',
 'Share your referral link with friends and earn bonus points when they complete 3 steps. Step 1: Sign up (+100P), Step 2: Join Discord (+200P), Step 3: Upload video (+300P). You can earn up to 600P per referral!',
 'Referral', 4, FALSE),

('포인트를 XLT 토큰으로 교환하려면?',
 'How do I exchange points for XLT tokens?',
 '마이페이지에서 "XLT Claim" 버튼을 클릭하여 포인트를 XLT 토큰으로 교환할 수 있습니다. 1,000 포인트 = 10 XLT이며, 월 1회 클레임 가능합니다. NFT 등급에 따라 부스트 혜택도 받을 수 있습니다.',
 'Click the "XLT Claim" button on My Page to exchange points for XLT tokens. 1,000 points = 10 XLT, and you can claim once per month. You can also receive boost benefits based on your NFT tier.',
 'Points', 5, FALSE);

-- ================================================
-- 5. 마이그레이션 기록
-- ================================================

INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_09_applied',
  jsonb_build_object(
    'version', '09',
    'applied_at', NOW(),
    'description', 'FAQ system with multi-language and full-text search'
  ),
  'Migration 09: FAQ system',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- ================================================
-- 완료 메시지
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 09 completed successfully!';
  RAISE NOTICE '   - Created faqs table';
  RAISE NOTICE '   - Added 6 indexes (category, published, order, pinned, FTS)';
  RAISE NOTICE '   - Inserted 5 sample FAQs';
END $$;
