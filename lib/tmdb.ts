import type {
  TMDBMovie,
  TMDBMovieDetail,
  TMDBSearchResult,
} from "@/types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "bc0891412903fa87995b94459b3cf9e6";

// Helper to retrieve native language poster (e.g. Chinese for Chinese films, Japanese for Anime, etc.)
async function getNativePoster(
  id: number,
  mediaType: "movie" | "tv",
  originalLanguage: string | undefined,
  defaultPoster: string | null
): Promise<string | null> {
  if (!originalLanguage || originalLanguage === "en") return defaultPoster;
  try {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = new URL(`${TMDB_BASE_URL}/${type}/${id}/images`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("include_image_language", `${originalLanguage},en,null`);
    
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.posters && data.posters.length > 0) {
        const native = data.posters.filter((p: any) => p.iso_639_1 === originalLanguage);
        if (native.length > 0) {
          native.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
          return native[0].file_path;
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch native poster for ${mediaType} ${id}:`, err);
  }
  return defaultPoster;
}

export async function resolveNativePostersForList(list: TMDBMovie[]): Promise<TMDBMovie[]> {
  try {
    return await Promise.all(
      list.map(async (item) => {
        const nativePoster = await getNativePoster(item.id, item.media_type ?? "movie", item.original_language, item.poster_path);
        return { ...item, poster_path: nativePoster };
      })
    );
  } catch (err) {
    console.error("Failed to resolve native posters for list:", err);
    return list;
  }
}

// ─── Image helpers ────────────────────────────────────────────────────────────

export function getPosterUrl(posterPath: string | null, size: "w185" | "w342" | "w500" | "original" = "w342"): string {
  if (!posterPath) return "/no-poster.svg";
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export function getBackdropUrl(backdropPath: string | null, size: "w780" | "w1280" | "original" = "w1280"): string {
  if (!backdropPath) return "";
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

// ─── Generic fetcher (mặc định en-US) ────────────────────────────────────────

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  language = "en-US"
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", language);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

// ─── Normalize TV response → TMDBMovie format ─────────────────────────────────

function normalizeTV(tv: any): TMDBMovie {
  return {
    id: tv.id,
    media_type: "tv",
    // TV dùng "name" thay vì "title" — normalize về title
    title: tv.name ?? tv.title ?? "",
    original_title: tv.original_name ?? tv.original_title ?? "",
    // TV dùng "first_air_date" — normalize về release_date
    release_date: tv.first_air_date ?? tv.release_date ?? "",
    poster_path: tv.poster_path ?? null,
    backdrop_path: tv.backdrop_path ?? null,
    overview: tv.overview ?? "",
    vote_average: tv.vote_average ?? 0,
    vote_count: tv.vote_count ?? 0,
    popularity: tv.popularity ?? 0,
    original_language: tv.original_language ?? "",
    genre_ids: tv.genre_ids,
  };
}

function normalizeMovie(movie: any): TMDBMovie {
  return { ...movie, media_type: "movie" as const };
}

// ─── Internal search helpers (một ngôn ngữ) ────────────────────────────────────

async function searchMovieLang(query: string, lang: string, year?: number | null): Promise<TMDBMovie[]> {
  const params: Record<string, string> = { query, include_adult: "false" };
  if (year) {
    params["primary_release_year"] = String(year);
  }
  const data = await tmdbFetch<TMDBSearchResult>(
    "/search/movie",
    params,
    lang
  ).catch(() => ({ results: [] } as TMDBSearchResult));
  return data.results.map(normalizeMovie);
}

async function searchTVLang(query: string, lang: string, year?: number | null): Promise<TMDBMovie[]> {
  const params: Record<string, string> = { query, include_adult: "false" };
  if (year) {
    params["first_air_date_year"] = String(year);
  }
  const data = await tmdbFetch<{ results: any[] }>(
    "/search/tv",
    params,
    lang
  ).catch(() => ({ results: [] }));
  return data.results.map(normalizeTV);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Phim trending */
export async function fetchTrending(timeWindow: "day" | "week" = "week"): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult>(`/trending/movie/${timeWindow}`);
  const list = data.results.slice(0, 18).map(normalizeMovie);
  return resolveNativePostersForList(list);
}

/** Phim đang chiếu rạp */
export async function fetchNowPlaying(): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult>("/movie/now_playing");
  const list = data.results.slice(0, 18).map(normalizeMovie);
  return resolveNativePostersForList(list);
}

/** Phim Top IMDb (Top Rated từ TMDB) */
export async function fetchTopRated(): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult>("/movie/top_rated");
  const list = data.results.slice(0, 18).map(normalizeMovie);
  return resolveNativePostersForList(list);
}

/** Phim Top Rated theo năm */
export async function fetchTopRatedByYear(year: number): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBSearchResult>("/discover/movie", {
    primary_release_year: String(year),
    sort_by: "vote_average.desc",
    "vote_count.gte": "20",
  });
  const list = data.results.slice(0, 18).map(normalizeMovie);
  return resolveNativePostersForList(list);
}

/** Phim mới nhất theo quốc gia */
export async function fetchLatestByCountry(country: "vietnam" | "usa" | "korea" | "japan"): Promise<TMDBMovie[]> {
  const today = new Date().toISOString().substring(0, 10);
  const params: Record<string, string> = {
    sort_by: "release_date.desc",
    "release_date.lte": today,
    "vote_count.gte": "5",
  };

  if (country === "vietnam") {
    params["with_original_language"] = "vi";
    params["vote_count.gte"] = "1";
  } else if (country === "usa") {
    params["with_original_language"] = "en";
    params["with_origin_country"] = "US";
  } else if (country === "korea") {
    params["with_original_language"] = "ko";
  } else if (country === "japan") {
    params["with_original_language"] = "ja";
  }

  try {
    const data = await tmdbFetch<TMDBSearchResult>("/discover/movie", params);
    const list = data.results.slice(0, 10).map(normalizeMovie);
    return resolveNativePostersForList(list);
  } catch (err) {
    console.error(`Failed to fetch latest movies for ${country}:`, err);
    return [];
  }
}

/** TV Series Trending */
export async function fetchTrendingTV(timeWindow: "day" | "week" = "week"): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<{ results: any[] }>(`/trending/tv/${timeWindow}`);
  const list = data.results.slice(0, 18).map(normalizeTV);
  return resolveNativePostersForList(list);
}

/** TV Series Đang chiếu (On the Air) */
export async function fetchOnTheAirTV(): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<{ results: any[] }>("/tv/on_the_air");
  const list = data.results.slice(0, 18).map(normalizeTV);
  return resolveNativePostersForList(list);
}

/** TV Series Top Rated */
export async function fetchTopRatedTV(): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<{ results: any[] }>("/tv/top_rated");
  const list = data.results.slice(0, 18).map(normalizeTV);
  return resolveNativePostersForList(list);
}

/** TV Series mới nhất theo quốc gia */
export async function fetchLatestTVByCountry(country: "china" | "korea" | "japan"): Promise<TMDBMovie[]> {
  const today = new Date().toISOString().substring(0, 10);
  const params: Record<string, string> = {
    sort_by: "first_air_date.desc",
    "first_air_date.lte": today,
    "vote_count.gte": "2",
  };

  if (country === "china") {
    params["with_original_language"] = "zh";
    params["vote_count.gte"] = "1";
  } else if (country === "korea") {
    params["with_original_language"] = "ko";
  } else if (country === "japan") {
    params["with_original_language"] = "ja";
  }

  try {
    const data = await tmdbFetch<{ results: any[] }>("/discover/tv", params);
    const list = data.results.slice(0, 10).map(normalizeTV);
    return resolveNativePostersForList(list);
  } catch (err) {
    console.error(`Failed to fetch latest TV shows for ${country}:`, err);
    return [];
  }
}

/** TV Series Top Rated theo năm */
export async function fetchTopRatedTVByYear(year: number): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<{ results: any[] }>("/discover/tv", {
    first_air_date_year: String(year),
    sort_by: "vote_average.desc",
    "vote_count.gte": "10",
  });
  const list = data.results.slice(0, 18).map(normalizeTV);
  return resolveNativePostersForList(list);
}


/**
 * Tìm kiếm phim + TV Series đa ngôn ngữ
 *
 * Tìm song song: Movie × 4 ngôn ngữ + TV × 4 ngôn ngữ = 8 requests đồng thời
 * Ngôn ngữ: en-US | vi-VN | zh-CN | zh-TW
 * → Bắt được: tên tiếng Anh, tiếng Việt (Trần Tình Lệnh), tiếng Trung (陈情令), v.v.
 * → Bắt được: phim lẫn TV series (ví dụ: Trần Tình Lệnh là TV series)
 *
 * TMDB search engine tự động tìm theo original_title bất kể language param
 * → Gõ tên gốc (陈情令) cũng tìm ra dù đang dùng en-US
 */
export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];

  const q = query.trim();

  // Trích xuất năm phát hành (4 chữ số từ 1900 đến 2099)
  const yearMatch = q.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
  const cleanQuery = yearMatch 
    ? q.replace(yearMatch[0], "").replace(/\s+/g, " ").trim() 
    : q;

  // Nếu trích xuất năm xong mà query trống (ví dụ user chỉ gõ "2025"), ta dùng lại query gốc
  const finalQuery = cleanQuery || q;

  // 8 requests song song
  const [
    mvEn, mvVi, mvZhCN, mvZhTW,
    tvEn, tvVi, tvZhCN, tvZhTW,
  ] = await Promise.all([
    searchMovieLang(finalQuery, "en-US", year),
    searchMovieLang(finalQuery, "vi-VN", year),
    searchMovieLang(finalQuery, "zh-CN", year),
    searchMovieLang(finalQuery, "zh-TW", year),
    searchTVLang(finalQuery, "en-US", year),
    searchTVLang(finalQuery, "vi-VN", year),
    searchTVLang(finalQuery, "zh-CN", year),
    searchTVLang(finalQuery, "zh-TW", year),
  ]);

  // Merge + deduplicate bằng key `{media_type}-{id}`
  const seen = new Set<string>();
  const merged: TMDBMovie[] = [];
  const enKeys = new Set<string>();

  // Ưu tiên en-US trước để có tên tiếng Anh sẵn
  for (const list of [mvEn, tvEn]) {
    for (const item of list) {
      const key = `${item.media_type}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        enKeys.add(key);
        merged.push(item);
      }
    }
  }

  // Thêm các ngôn ngữ khác
  for (const list of [mvVi, tvVi, mvZhCN, tvZhCN, mvZhTW, tvZhTW]) {
    for (const item of list) {
      const key = `${item.media_type}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
  }

  // Sắp xếp ưu tiên phim mới nhất phù hợp với từ khóa
  const topResults = merged
    .sort((a, b) => {
      const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
      const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 24);

  // Với những phim ở top 24 không có trong en-US search (do tìm bằng tiếng Việt/Trung/Hàn/...),
  // fetch English title của chúng để hiển thị tiếng Anh mặc định
  const nonEnItems = topResults.filter(
    (item) => !enKeys.has(`${item.media_type}-${item.id}`)
  );

  if (nonEnItems.length > 0) {
    await Promise.all(
      nonEnItems.map(async (item) => {
        try {
          const detail = await tmdbFetch<any>(
            item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`,
            {},
            "en-US"
          );
          item.title = detail.name ?? detail.title ?? item.title;
          item.overview = detail.overview ?? item.overview;
        } catch (err) {
          console.error(
            `Failed to fetch English details for ${item.media_type}-${item.id}:`,
            err
          );
        }
      })
    );
  }

  return resolveNativePostersForList(topResults);
}

/**
 * Chi tiết phim hoặc TV Series
 * @param type 'movie' | 'tv' — dùng đúng endpoint tương ứng
 */
export async function fetchMovieDetails(
  id: number | string,
  type: "movie" | "tv" = "movie"
): Promise<TMDBMovieDetail> {
  const endpoint = type === "tv" ? `/tv/${id}` : `/movie/${id}`;
  const raw = await tmdbFetch<any>(
    endpoint,
    { 
      append_to_response: "credits,images,alternative_titles",
      include_image_language: "en,null,vi,ja,ko,zh,fr,es,de,it,ru,pt,th,hi,id"
    },
    "en-US"
  );

  // Ưu tiên poster có cùng ngôn ngữ gốc với nơi sản xuất phim
  let poster_path = raw.poster_path;
  if (raw.images?.posters && raw.original_language && raw.original_language !== "en") {
    const nativePosters = raw.images.posters.filter(
      (p: any) => p.iso_639_1 === raw.original_language
    );
    if (nativePosters.length > 0) {
      nativePosters.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
      poster_path = nativePosters[0].file_path;
    }
  }

  if (type === "tv") {
    // Normalize TV detail để dùng chung interface TMDBMovieDetail
    return {
      ...raw,
      poster_path,
      media_type: "tv",
      title: raw.name ?? raw.title,
      original_title: raw.original_name ?? raw.original_title ?? "",
      release_date: raw.first_air_date ?? "",
      runtime: raw.episode_run_time?.[0] ?? 0,
    } as TMDBMovieDetail;
  }

  return { ...raw, poster_path, media_type: "movie" } as TMDBMovieDetail;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lấy đạo diễn / người tạo ra phim hoặc TV series */
export function getDirector(movie: TMDBMovieDetail): string {
  // TV Series: dùng "created_by" thay vì crew Director
  if (movie.created_by?.length) {
    return movie.created_by[0].name;
  }
  return movie.credits?.crew?.find((c) => c.job === "Director")?.name ?? "Unknown";
}

/** Lấy năm từ release_date hoặc first_air_date */
export function getYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const y = parseInt(releaseDate.substring(0, 4));
  return isNaN(y) ? null : y;
}

/** vote_average (0-10) → thang 0-5 */
export function normalizeRating(voteAverage: number): number {
  return Math.round((voteAverage / 2) * 10) / 10;
}

/** Format số lớn: 12345 → "12K", 1234567 → "1.2M" */
export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return `${count}`;
}

// ─── TV Season/Episode helpers ────────────────────────────────────────────────

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

export interface TMDBSeasonDetail {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string | null;
  poster_path: string | null;
  episodes: TMDBEpisode[];
}

/** Fetch chi tiết 1 season của TV Series (danh sách episodes) */
export async function fetchTVSeasonDetails(
  tvId: number | string,
  seasonNumber: number
): Promise<TMDBSeasonDetail> {
  return tmdbFetch<TMDBSeasonDetail>(
    `/tv/${tvId}/season/${seasonNumber}`,
    {},
    "en-US"
  );
}

/** Fetch danh sách ảnh (posters + backdrops) của phim/TV show */
export async function fetchMediaImages(
  id: number | string,
  mediaType: "movie" | "tv"
): Promise<{ posters: any[]; backdrops: any[] }> {
  const type = mediaType === "tv" ? "tv" : "movie";
  return tmdbFetch<{ posters: any[]; backdrops: any[] }>(
    `/${type}/${id}/images`,
    { include_image_language: "en,ja,zh,ko,vi,null" },
    "en-US"
  );
}

/** Fetch danh sách các nhóm tập phim (alternative episode groups) của TV Show */
export async function fetchTVEpisodeGroups(tvId: number | string): Promise<{ results: any[] }> {
  return tmdbFetch<{ results: any[] }>(
    `/tv/${tvId}/episode_groups`,
    {},
    "en-US"
  );
}

/** Fetch chi tiết cấu trúc nhóm tập phim (seasons + episodes) của nhóm đó */
export async function fetchTVEpisodeGroupDetails(groupId: string): Promise<any> {
  return tmdbFetch<any>(
    `/tv/episode_group/${groupId}`,
    {},
    "en-US"
  );
}

