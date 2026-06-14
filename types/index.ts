// ─────────────────────────────────────────────
// Types cho TMDB API response
// ─────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  media_type?: 'movie' | 'tv';    // 'tv' cho TV Series, 'movie' cho phim
  title: string;
  original_title: string;         // Tên gốc: 陈情令, 진격의 거인, v.v.
  release_date: string;           // "2024-03-01" (hoặc first_air_date cho TV đã normalize)
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;           // 0–10 từ cộng đồng TMDB
  vote_count: number;             // Số votes trên TMDB
  genre_ids?: number[];
  genres?: TMDBGenre[];
  runtime?: number;
  popularity: number;
  original_language: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBCreatedBy {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDBAlternativeTitle {
  iso_3166_1: string;
  title: string;
  type: string;
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string | null;
  poster_path: string | null;
  episode_count: number;
}

export interface TMDBMovieDetail extends TMDBMovie {
  genres: TMDBGenre[];
  runtime: number;
  credits: TMDBCredits;
  tagline?: string;
  status?: string;
  production_companies?: TMDBProductionCompany[];
  production_countries?: TMDBProductionCountry[];
  alternative_titles?: { titles?: TMDBAlternativeTitle[]; results?: TMDBAlternativeTitle[] };
  images?: { backdrops?: { file_path: string; vote_average: number }[] };
  // TV-specific
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: TMDBCreatedBy[];
  networks?: { id: number; name: string; logo_path: string | null }[];
  seasons?: TMDBSeason[];
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBMovie[];
  total_results: number;
  total_pages: number;
}

// ─────────────────────────────────────────────
// Types cho Supabase diary_entries
// ─────────────────────────────────────────────

export interface DiaryEntry {
  id?: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';  // Phân biệt phim và TV Series
  title: string;
  year: number | null;
  poster_path: string | null;
  director: string;
  watched_on: string;
  watched_before: boolean;
  review: string;
  tags: string[];
  rating: number;           // 0–5, hỗ trợ 0.5 (lưu REAL trong Supabase)
  liked: boolean;
  season_number?: number | null; // Số season đã xem cho TV Series
  created_at?: string;
}

export type NewDiaryEntry = Omit<DiaryEntry, 'id' | 'created_at'>;
