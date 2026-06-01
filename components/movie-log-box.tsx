"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Eye, Bookmark, X } from "lucide-react";
import { 
  supabase, 
  STATIC_USER_ID, 
  addDiaryEntry, 
  deleteDiaryEntry, 
  addToWatchlist, 
  removeFromWatchlist, 
  isInWatchlist 
} from "@/lib/supabase";

// ─── Date formatting (DD Mon YYYY — matches diary-section parser) ─────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Half-star Rating ─────────────────────────────────────────────────────────
const STAR_PATH =
  "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z";

interface LogBoxStarProps {
  rating: number;
  onRatingChange: (r: number) => void;
}

function LogBoxStar({ rating, onRatingChange }: LogBoxStarProps) {
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  const getVal = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star;
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = display >= star;
        const isHalf = !isFull && display >= star - 0.5;
        return (
          <button
            key={star}
            type="button"
            className="relative h-7 w-7 cursor-pointer flex-shrink-0"
            onMouseMove={(e) => setHover(getVal(star, e))}
            onMouseLeave={() => setHover(0)}
            onClick={(e) => {
              const v = getVal(star, e);
              onRatingChange(v === rating ? 0 : v);
            }}
          >
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-7 w-7 text-[#456]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
            </svg>
            {(isFull || isHalf) && (
              <svg
                viewBox="0 0 24 24"
                className="absolute inset-0 h-7 w-7 text-[#00e054]"
                fill="currentColor"
                style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
              >
                <path d={STAR_PATH} />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Helper to get release year of a specific season
function getSeasonReleaseYear(seasonsList: any[] | undefined, seasonNumber: number | null, fallbackYear: number | null): number | null {
  if (!seasonsList || seasonNumber === null) return fallbackYear;
  const season = seasonsList.find((s: any) => s.season_number === seasonNumber);
  if (season && season.air_date) {
    const y = parseInt(season.air_date.substring(0, 4));
    return isNaN(y) ? fallbackYear : y;
  }
  return fallbackYear;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MovieLogBoxProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  director: string;
  numberOfSeasons?: number; // Nhận số lượng seasons
  seasons?: any[]; // Danh sách seasons để lấy ngày phát hành
}

// ─── Main Log Box Component ───────────────────────────────────────────────────
export function MovieLogBox({ 
  tmdbId, 
  mediaType, 
  title, 
  year, 
  posterPath, 
  director,
  numberOfSeasons = 0,
  seasons = []
}: MovieLogBoxProps) {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [watched, setWatched] = useState(false);
  const [watchlist, setWatchlist] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  
  // State quản lý season đang được chọn (chỉ dùng cho TV series có nhiều season)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    mediaType === "tv" && numberOfSeasons > 1 ? 1 : null
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing diary entry và watchlist status từ DB
  useEffect(() => {
    async function loadStatus() {
      // Reset trước khi load để tránh nhấp nháy dữ liệu cũ
      setExistingId(null);
      setRating(0);
      setLiked(false);
      setWatched(false);

      let query = supabase
        .from("diary_entries")
        .select("id, rating, liked")
        .eq("user_id", STATIC_USER_ID)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType);

      if (mediaType === "tv" && numberOfSeasons > 1 && selectedSeason !== null) {
        query = query.eq("season_number", selectedSeason);
      } else {
        query = query.is("season_number", null);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setExistingId(data.id ?? null);
        setRating(data.rating ?? 0);
        setLiked(data.liked ?? false);
        setWatched(true);
      }
    }

    async function loadWatchlist() {
      const inWatchlist = await isInWatchlist(tmdbId, mediaType);
      setWatchlist(inWatchlist);
    }

    loadStatus();
    loadWatchlist();
  }, [tmdbId, mediaType, selectedSeason, numberOfSeasons]);

  // Auto-save after rating changes (debounced 600ms)
  async function saveEntry(newRating: number, newLiked: boolean, newWatched: boolean) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const today = formatDate(new Date());
      
      const finalTitle = (mediaType === "tv" && numberOfSeasons > 1 && selectedSeason !== null)
        ? `${title} — Season ${selectedSeason}`
        : title;

      const finalYear = (mediaType === "tv" && numberOfSeasons > 1 && selectedSeason !== null)
        ? getSeasonReleaseYear(seasons, selectedSeason, year)
        : year;

      if (existingId) {
        await supabase
          .from("diary_entries")
          .update({ 
            rating: newRating, 
            liked: newLiked, 
            watched_on: today,
            title: finalTitle,
            year: finalYear
          })
          .eq("id", existingId)
          .eq("user_id", STATIC_USER_ID);
      } else {
        const result = await addDiaryEntry({
          user_id: STATIC_USER_ID,
          tmdb_id: tmdbId,
          media_type: mediaType,
          title: finalTitle,
          year: finalYear,
          poster_path: posterPath,
          director,
          watched_on: today,
          watched_before: false,
          review: "",
          tags: [],
          rating: newRating,
          liked: newLiked,
          season_number: (mediaType === "tv" && numberOfSeasons > 1) ? selectedSeason : null,
        } as any);
        if (result) setExistingId(result.id ?? null);
      }
    }, 600);
  }

  function handleRating(newRating: number) {
    setRating(newRating);
    if (newRating > 0 && !watched) setWatched(true);
    saveEntry(newRating, liked, newRating > 0 ? true : watched);
  }

  // Clear rating → also delete diary entry and reset watched
  async function handleClearRating() {
    setRating(0);
    setWatched(false);
    setLiked(false);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (existingId) {
      await deleteDiaryEntry(existingId);
      setExistingId(null);
    }
  }

  function handleLike() {
    const next = !liked;
    setLiked(next);
    saveEntry(rating, next, watched);
  }

  function handleWatched() {
    const next = !watched;
    setWatched(next);
    saveEntry(rating, liked, next);
  }

  async function handleWatchlistToggle() {
    const next = !watchlist;
    setWatchlist(next);
    if (next) {
      await addToWatchlist({
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        year,
        poster_path: posterPath,
      });
    } else {
      await removeFromWatchlist(tmdbId, mediaType);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-[#1c2228] overflow-hidden w-full max-w-[260px]">
      {/* Top icon row */}
      <div className="grid grid-cols-3 divide-x divide-border/40">
        {/* Watch / Watched */}
        <button
          onClick={handleWatched}
          className={`flex flex-col items-center gap-1 py-3 transition-colors ${watched ? "text-[#00e054]" : "text-[#678] hover:text-white"}`}
          title={watched ? "Watched" : "Mark as watched"}
        >
          <Eye className={`h-5 w-5 ${watched ? "fill-[#00e054]/20" : ""}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            {watched ? "Watched" : "Watch"}
          </span>
        </button>

        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex flex-col items-center gap-1 py-3 transition-colors ${liked ? "text-red-400" : "text-[#678] hover:text-white"}`}
          title="Like"
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-red-400" : ""}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Like</span>
        </button>

        {/* Watchlist */}
        <button
          onClick={handleWatchlistToggle}
          className={`flex flex-col items-center gap-1 py-3 transition-colors ${watchlist ? "text-[#40bcf4]" : "text-[#678] hover:text-white"}`}
          title="Watchlist"
        >
          <Bookmark className={`h-5 w-5 ${watchlist ? "fill-[#40bcf4]" : ""}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Watchlist</span>
        </button>
      </div>

      {mediaType === "tv" && numberOfSeasons > 1 && (
        <>
          <div className="h-px bg-border/40" />
          <div className="px-4 py-2 bg-[#161b20] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#678]">Season</span>
            <select
              value={selectedSeason ?? 1}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-[#2c3440] text-xs text-[#9ab] border border-border/40 rounded px-2 py-0.5 focus:outline-none focus:border-[#00e054] transition-colors cursor-pointer"
            >
              {Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  Season {s}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="h-px bg-border/40" />

      {/* Star rating — absolute design to prevent any layout shift */}
      <div className="px-4 py-3 relative">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#678]">Rate</p>
        <div className="relative flex items-center justify-center h-7 w-full px-8">
          <LogBoxStar rating={rating} onRatingChange={handleRating} />
          {/* X button — absolute position at the right side */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
            {rating > 0 && (
              <button
                onClick={handleClearRating}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2c3440] text-muted-foreground hover:bg-[#3a4550] hover:text-white transition-colors"
                title="Clear rating"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {/* Rating text — fixed height to prevent layout shift */}
        <div className="h-5 flex items-center justify-center mt-1">
          {rating > 0 && (
            <p className="text-center text-[10px] text-[#9ab]">{rating} / 5 stars</p>
          )}
        </div>
      </div>
    </div>
  );
}

