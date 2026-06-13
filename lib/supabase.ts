import { createClient } from "@supabase/supabase-js";
import type { DiaryEntry, NewDiaryEntry } from "@/types";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── User ID tĩnh (giai đoạn 1 — chưa có auth) ───────────────────────────────

export const STATIC_USER_ID = "FILMFAN_01";

// ─── Diary Entries CRUD ───────────────────────────────────────────────────────

/** Lấy tất cả diary entries của user, mới nhất trước */
export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("user_id", STATIC_USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] getDiaryEntries error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Thêm diary entry mới */
export async function addDiaryEntry(entry: NewDiaryEntry): Promise<DiaryEntry | null> {
  const sanitizedEntry = {
    ...entry,
    user_id: STATIC_USER_ID,
    rating: parseFloat(String(entry.rating)) || 0,
    season_number: entry.season_number !== undefined ? entry.season_number : null,
  };

  const { data, error } = await supabase
    .from("diary_entries")
    .insert([sanitizedEntry])
    .select()
    .single();

  if (error) {
    console.error("[Supabase] addDiaryEntry error:", error.message);
    return null;
  }
  return data;
}

/** Xóa diary entry theo id */
export async function deleteDiaryEntry(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("diary_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", STATIC_USER_ID);

  if (error) {
    console.error("[Supabase] deleteDiaryEntry error:", error.message);
    return false;
  }
  return true;
}

/** Update diary entry */
export async function updateDiaryEntry(
  id: string,
  updates: Partial<NewDiaryEntry>
): Promise<DiaryEntry | null> {
  const sanitizedUpdates: Partial<NewDiaryEntry> = { ...updates };
  if (updates.rating !== undefined) {
    sanitizedUpdates.rating = parseFloat(String(updates.rating)) || 0;
  }

  const { data, error } = await supabase
    .from("diary_entries")
    .update(sanitizedUpdates)
    .eq("id", id)
    .eq("user_id", STATIC_USER_ID)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] updateDiaryEntry error:", error.message);
    return null;
  }
  return data;
}

/** Kiểm tra xem phim đã được log chưa */
export async function isMovieLogged(tmdbId: number): Promise<boolean> {
  const { data } = await supabase
    .from("diary_entries")
    .select("id")
    .eq("user_id", STATIC_USER_ID)
    .eq("tmdb_id", tmdbId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ─── Watchlist CRUD ──────────────────────────────────────────────────────────

export interface WatchlistItem {
  id?: string;
  user_id?: string;
  tmdb_id: number;
  media_type: string;
  title: string;
  year?: number | null;
  poster_path?: string | null;
  created_at?: string;
}

/** Lấy toàn bộ danh sách xem sau của user */
export async function getWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", STATIC_USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] getWatchlist error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Thêm phim/TV series vào watchlist */
export async function addToWatchlist(item: Omit<WatchlistItem, 'id' | 'user_id' | 'created_at'>): Promise<WatchlistItem | null> {
  const { data, error } = await supabase
    .from("watchlist")
    .insert([{ ...item, user_id: STATIC_USER_ID }])
    .select()
    .single();

  if (error) {
    console.error("[Supabase] addToWatchlist error:", error.message);
    return null;
  }
  return data;
}

/** Xóa phim/TV series khỏi watchlist */
export async function removeFromWatchlist(tmdbId: number, mediaType: string): Promise<boolean> {
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", STATIC_USER_ID)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);

  if (error) {
    console.error("[Supabase] removeFromWatchlist error:", error.message);
    return false;
  }
  return true;
}

/** Kiểm tra xem phim đã có trong watchlist chưa */
export async function isInWatchlist(tmdbId: number, mediaType: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", STATIC_USER_ID)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error) {
    return false;
  }
  return !!data;
}

// ─── Media Customization CRUD ──────────────────────────────────────────────────

export interface MediaCustomization {
  id?: string;
  user_id?: string;
  tmdb_id: number;
  media_type: string;
  custom_poster_path?: string | null;
  custom_backdrop_path?: string | null;
  season_group_id?: string | null;
  custom_season_names?: Record<string, string>;
  created_at?: string;
}

/** Lấy cấu hình tùy chỉnh cho phim/TV show */
export async function getMediaCustomization(tmdbId: number, mediaType: string): Promise<MediaCustomization | null> {
  const { data, error } = await supabase
    .from("media_customizations")
    .select("*")
    .eq("user_id", STATIC_USER_ID)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] getMediaCustomization error:", error.message);
    return null;
  }
  return data;
}

/** Lưu cấu hình tùy chỉnh cho phim/TV show */
export async function upsertMediaCustomization(
  customization: Omit<MediaCustomization, 'id' | 'user_id' | 'created_at'> & Partial<Pick<MediaCustomization, 'user_id'>>
): Promise<MediaCustomization | null> {
  const payload = {
    ...customization,
    user_id: STATIC_USER_ID,
  };

  const { data, error } = await supabase
    .from("media_customizations")
    .upsert([payload], { onConflict: "user_id,tmdb_id,media_type" })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] upsertMediaCustomization error:", error.message);
    return null;
  }
  return data;
}


