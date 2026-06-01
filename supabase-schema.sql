-- ═══════════════════════════════════════════════════════════════
-- CEnt — Supabase Schema (Full + Migration)
-- ═══════════════════════════════════════════════════════════════

-- ── Tạo bảng mới (nếu chưa có) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS diary_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT NOT NULL DEFAULT 'FILMFAN_01',

  -- Thông tin từ TMDB
  tmdb_id       INTEGER NOT NULL,
  media_type    TEXT NOT NULL DEFAULT 'movie',  -- 'movie' | 'tv'
  title         TEXT NOT NULL,
  year          INTEGER,
  poster_path   TEXT,
  director      TEXT DEFAULT '',

  -- Nhật ký cá nhân
  watched_on    TEXT NOT NULL,
  watched_before BOOLEAN DEFAULT FALSE,
  review        TEXT DEFAULT '',
  tags          TEXT[] DEFAULT '{}',
  -- REAL để hỗ trợ half-star: 0, 0.5, 1, 1.5, ..., 5
  rating        REAL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  liked         BOOLEAN DEFAULT FALSE,

  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id   ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created   ON diary_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_tmdb_id   ON diary_entries(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_media_type ON diary_entries(media_type);

-- ── Row Level Security ──────────────────────────────────────────
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for now"
  ON diary_entries FOR ALL
  USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Chạy nếu bảng đã tồn tại từ lần trước
-- ═══════════════════════════════════════════════════════════════

-- 1. Thêm cột media_type (nếu chưa có)
ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'movie';

-- 2. Đổi kiểu rating từ INTEGER → REAL (để hỗ trợ 0.5 half-star)
--    Chạy từng lệnh một nếu cần:
ALTER TABLE diary_entries
  ALTER COLUMN rating TYPE REAL USING rating::REAL;

-- 3. Update constraint để REAL vẫn valid
ALTER TABLE diary_entries
  DROP CONSTRAINT IF EXISTS diary_entries_rating_check;
ALTER TABLE diary_entries
  ADD CONSTRAINT diary_entries_rating_check CHECK (rating >= 0 AND rating <= 5);


-- ── Bảng omdb_cache để lưu cache OMDB 7 ngày ───────────────────
CREATE TABLE IF NOT EXISTS omdb_cache (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id       INTEGER UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  year          INTEGER,
  media_type    TEXT NOT NULL DEFAULT 'movie',
  response      JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_omdb_cache_tmdb_id ON omdb_cache(tmdb_id);

-- Cho phép tất cả thao tác (RLS tạm thời)
ALTER TABLE omdb_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for omdb_cache"
  ON omdb_cache FOR ALL
  USING (true) WITH CHECK (true);


-- ── Bảng watchlist để lưu danh sách xem sau ───────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'FILMFAN_01',
  tmdb_id     INTEGER NOT NULL,
  media_type  TEXT NOT NULL DEFAULT 'movie',
  title       TEXT NOT NULL,
  year        INTEGER,
  poster_path TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, tmdb_id, media_type)
);

-- RLS cho watchlist
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for watchlist"
  ON watchlist FOR ALL
  USING (true) WITH CHECK (true);


-- ── MIGRATIONS CHO DIARY ENTRIES ──────────────────────────────────
-- 4. Thêm cột season_number cho TV series có nhiều season
ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS season_number INTEGER;


-- ── Verify ──────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('diary_entries', 'omdb_cache', 'watchlist')
ORDER BY table_name, ordinal_position;
