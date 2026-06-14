"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, Trash2, Tv, RotateCcw, MessageSquare, ChevronDown, Pencil, Download, Upload, Loader2, Film } from "lucide-react";
import { getPosterUrl } from "@/lib/tmdb";
import { getOmdbData } from "@/lib/omdb";
import { deleteDiaryEntry, updateDiaryEntry } from "@/lib/supabase";
import { robustParseDate, formatDate } from "@/lib/utils";
import type { DiaryEntry } from "@/types";

const STAR_PATH = "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z";

// ─── Date normalizer: handle both "DD Mon YYYY" and "YYYY-MM-DD" formats ──────
function normalizeWatchedOn(watchedOn: string): string {
  const parsed = robustParseDate(watchedOn);
  if (parsed) {
    return formatDate(parsed);
  }
  return watchedOn;
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(entries: DiaryEntry[]) {
  const headers = ["title", "year", "tmdb_id", "media_type", "rating", "liked", "watched_before", "watched_on", "review"];
  const rows = entries.map((entry) => [
    entry.title,
    entry.year ?? "",
    entry.tmdb_id,
    entry.media_type ?? "movie",
    entry.rating,
    entry.liked ? "true" : "false",
    entry.watched_before ? "true" : "false",
    entry.watched_on,
    entry.review ?? ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(escapeCSV).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `cent_movie_diary_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(currentVal.trim());
      currentVal = "";
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== "")) {
        result.push(row);
      }
      row = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== "")) {
      result.push(row);
    }
  }
  return result;
}

export async function importFromCSV(
  csvText: string,
  onAddEntry: (entry: any) => Promise<any>
): Promise<{ success: number; failed: number }> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error("CSV file is empty or missing data rows.");
  }

  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  
  // Dynamic header mapping to support multiple names in English or Vietnamese
  const findHeaderIndex = (names: string[]) => {
    return headers.findIndex(h => names.some(n => h.includes(n) || n.includes(h)));
  };

  const titleIdx = findHeaderIndex(["title", "film", "name", "phim", "tiêu đề"]);
  const yearIdx = findHeaderIndex(["year", "released", "năm"]);
  const tmdbIdIdx = findHeaderIndex(["tmdb_id", "tmdbid", "id"]);
  const mediaTypeIdx = findHeaderIndex(["media_type", "mediatype", "type", "loại"]);
  const ratingIdx = findHeaderIndex(["rating", "score", "rate", "điểm", "đánh giá"]);
  const likedIdx = findHeaderIndex(["liked", "like", "thích", "tim"]);
  const watchedBeforeIdx = findHeaderIndex(["watched_before", "rewatch", "xem lại"]);
  const watchedOnIdx = findHeaderIndex(["watched_on", "watched_date", "date", "ngày", "ngày xem"]);
  const reviewIdx = findHeaderIndex(["review", "comment", "nhận xét", "bình luận"]);
  const posterPathIdx = findHeaderIndex(["poster_path", "poster"]);

  if (titleIdx === -1) {
    throw new Error("CSV must contain at least 'Title' or 'Film' column.");
  }

  let successCount = 0;
  let failedCount = 0;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 1) continue;

    try {
      const title = row[titleIdx]?.trim();
      if (!title) {
        failedCount++;
        continue;
      }

      // 1. Gather baseline attributes
      const year = yearIdx !== -1 && row[yearIdx] ? parseInt(row[yearIdx]) || null : null;
      let rating = 0;
      if (ratingIdx !== -1 && row[ratingIdx]) {
        const rawRating = row[ratingIdx].trim();
        // Match star characters e.g. "★★★½" or "★★★"
        if (rawRating.includes("★") || rawRating.includes("½")) {
          let stars = (rawRating.match(/★/g) || []).length;
          if (rawRating.includes("½") || rawRating.includes("1/2")) {
            stars += 0.5;
          }
          rating = stars;
        } else {
          const parsed = parseFloat(rawRating);
          if (!isNaN(parsed)) {
            rating = parsed > 5 ? parsed / 2 : parsed;
          }
        }
      }

      const liked = likedIdx !== -1 && row[likedIdx] ? row[likedIdx].toLowerCase() === "true" || row[likedIdx] === "1" : false;
      const watched_before = watchedBeforeIdx !== -1 && row[watchedBeforeIdx] ? row[watchedBeforeIdx].toLowerCase() === "true" || row[watchedBeforeIdx] === "1" : false;
      
      const now = new Date();
      const defaultWatchedOn = formatDate(now);
      let watched_on = defaultWatchedOn;

      if (watchedOnIdx !== -1 && row[watchedOnIdx]) {
        const rawDate = row[watchedOnIdx].trim();
        const parsedDate = robustParseDate(rawDate);
        if (parsedDate) {
          watched_on = formatDate(parsedDate);
        } else {
          watched_on = defaultWatchedOn;
        }
      }

      const review = reviewIdx !== -1 && row[reviewIdx] ? row[reviewIdx].trim() : "";

      // 2. Resolve TMDB metadata dynamically
      let tmdb_id = tmdbIdIdx !== -1 && row[tmdbIdIdx] ? parseInt(row[tmdbIdIdx]) : NaN;
      let media_type: "movie" | "tv" = mediaTypeIdx !== -1 && row[mediaTypeIdx]?.trim().toLowerCase() === "tv" ? "tv" : "movie";
      let poster_path = posterPathIdx !== -1 ? row[posterPathIdx] : null;

      if (isNaN(tmdb_id)) {
        // dynamic lookup via searchMovies — truyền year vào query để TMDB lọc chính xác
        try {
          const { searchMovies } = await import("@/lib/tmdb");
          const searchQuery = year ? `${title} ${year}` : title;
          const searchResults = await searchMovies(searchQuery);
          if (searchResults && searchResults.length > 0) {
            // Thuật toán chọn kết quả tốt nhất:
            // 1. Ưu tiên khớp chính xác cả tên + năm
            // 2. Khớp gần đúng tên + đúng năm
            // 3. Khớp tên gần nhất
            const titleLower = title.toLowerCase();
            let match = searchResults[0];
            let bestScore = -1;

            for (const r of searchResults) {
              let score = 0;
              const rTitle = (r.title || "").toLowerCase();
              const rOrigTitle = (r.original_title || "").toLowerCase();
              const rYear = r.release_date ? parseInt(r.release_date.substring(0, 4)) : null;

              // Điểm tương đồng tiêu đề
              if (rTitle === titleLower || rOrigTitle === titleLower) {
                score += 100; // Khớp chính xác
              } else if (rTitle.includes(titleLower) || titleLower.includes(rTitle)) {
                score += 50; // Khớp một phần
              } else if (rOrigTitle.includes(titleLower) || titleLower.includes(rOrigTitle)) {
                score += 40;
              }

              // Điểm năm
              if (year && rYear === year) {
                score += 80; // Đúng năm
              } else if (year && rYear && Math.abs(rYear - year) <= 1) {
                score += 30; // Gần đúng năm (±1)
              }

              // Điểm popularity (tiebreaker)
              score += Math.min((r.popularity || 0) / 100, 5);

              if (score > bestScore) {
                bestScore = score;
                match = r;
              }
            }

            tmdb_id = match.id;
            media_type = match.media_type === "tv" ? "tv" : "movie";
            poster_path = match.poster_path ?? null;
          } else {
            console.warn(`Could not find film on TMDB for title: "${title}"`);
            failedCount++;
            continue;
          }
        } catch (searchErr) {
          console.error(`Search error for title: "${title}":`, searchErr);
          failedCount++;
          continue;
        }
      }

      // 3. Luôn xác minh năm released từ TMDB (CSV có thể sai năm)
      //    Đồng thời lấy poster nếu chưa có
      let verifiedYear: number | null = year;
      if (tmdb_id) {
        try {
          const { fetchMovieDetails } = await import("@/lib/tmdb");
          const details = await fetchMovieDetails(tmdb_id, media_type);
          if (details?.release_date) {
            const tmdbYear = parseInt(details.release_date.substring(0, 4));
            if (!isNaN(tmdbYear)) {
              verifiedYear = tmdbYear;
            }
          }
          if (!poster_path && details?.poster_path) {
            poster_path = details.poster_path;
          }
        } catch (tmdbErr) {
          console.warn("Failed to verify year from TMDB:", tmdbErr);
        }
      }

      const entry = {
        tmdb_id,
        title,
        year: verifiedYear,
        poster_path,
        rating,
        liked,
        watched_before,
        watched_on,
        review,
        media_type
      };

      await onAddEntry(entry);
      successCount++;
    } catch (rowErr) {
      console.error(`Row ${i} import failed:`, rowErr);
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
}

function DiaryStars({ rating, size = "h-3.5 w-3.5", emptyColor = "text-[#2c3440]" }: { rating: number; size?: string; emptyColor?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = rating >= star;
        const isHalf = !isFull && rating >= star - 0.5;

        return (
          <div key={star} className={`relative ${size} flex-shrink-0 select-none`}>
            {/* Background: Empty star */}
            <svg viewBox="0 0 24 24" className={`absolute inset-0 ${size} ${emptyColor}`} fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
            </svg>

            {/* Foreground: Filled star / Half star */}
            {(isFull || isHalf) && (
              <svg
                viewBox="0 0 24 24"
                className={`absolute inset-0 ${size} text-[#00e054]`}
                fill="currentColor"
                style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
              >
                <path d={STAR_PATH} />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableStarRating({
  entryId,
  initialRating,
  onRefresh,
}: {
  entryId: string;
  initialRating: number;
  onRefresh: () => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const getVal = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star;
  };

  const handleRatingChange = async (newVal: number) => {
    const targetVal = newVal === rating ? 0 : newVal;
    setRating(targetVal);
    
    try {
      await updateDiaryEntry(entryId, { rating: targetVal });
      // Không gọi onRefresh() ở đây — local state đã cập nhật, tránh reload toàn bộ bảng
    } catch (err) {
      console.error("Failed to update rating directly in table:", err);
      setRating(initialRating);
    }
  };

  return (
    <div className="flex items-center gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = display >= star;
        const isHalf = !isFull && display >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            className="relative h-4 w-4 cursor-pointer flex-shrink-0"
            onMouseMove={(e) => setHover(getVal(star, e))}
            onMouseLeave={() => setHover(0)}
            onClick={(e) => {
              const v = getVal(star, e);
              handleRatingChange(v);
            }}
          >
            {/* Background: Empty star */}
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-4 w-4 text-[#2c3440]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
            </svg>

            {/* Foreground: Filled star / Half star */}
            {(isFull || isHalf) && (
              <svg
                viewBox="0 0 24 24"
                className="absolute inset-0 h-4 w-4 text-[#00e054]"
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

function TableLikeToggle({
  entryId,
  initialLiked,
  onRefresh,
}: {
  entryId: string;
  initialLiked: boolean;
  onRefresh: () => void;
}) {
  const [liked, setLiked] = useState(initialLiked);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const handleToggle = async () => {
    const targetVal = !liked;
    setLiked(targetVal);

    try {
      await updateDiaryEntry(entryId, { liked: targetVal });
      // Không gọi onRefresh() ở đây — local state đã cập nhật, tránh reload toàn bộ bảng
    } catch (err) {
      console.error("Failed to toggle like directly in table:", err);
      setLiked(initialLiked);
    }
  };

  return (
    <button type="button" onClick={handleToggle} className="block mx-auto focus:outline-none">
      {liked ? (
        <Heart className="h-4 w-4 fill-[#00e054] text-[#00e054] hover:scale-110 active:scale-95 transition-all" />
      ) : (
        <Heart className="h-4 w-4 text-[#678] hover:text-[#00e054] hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/row:opacity-100" />
      )}
    </button>
  );
}

interface DiarySectionProps {
  entries: DiaryEntry[];
  onDelete: () => void;
  onEdit: (entry: DiaryEntry) => void;
  onRefresh: () => void;
}

export function DiarySection({ entries, onDelete, onEdit, onRefresh }: DiarySectionProps) {
  // Filters state
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [diaryYearFilter, setDiaryYearFilter] = useState<string>("all");
  const [decadeFilter, setDecadeFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Infinite Scroll state
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [loadMoreTrigger, setLoadMoreTrigger] = useState<HTMLDivElement | null>(null);

  // Reset visibleCount when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [ratingFilter, diaryYearFilter, decadeFilter, genreFilter, typeFilter, sortOrder]);

  // Load more on intersection
  useEffect(() => {
    if (!loadMoreTrigger) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(loadMoreTrigger);
    return () => observer.disconnect();
  }, [loadMoreTrigger]);

  // Import/Export and Custom Delete Dialog states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("Could not read file content.");
        }

        const result = await importFromCSV(text, async (entry) => {
          const { addDiaryEntry } = await import("@/lib/supabase");
          await addDiaryEntry(entry);
        });

        setImportResult(result);
        onRefresh();
      } catch (err: any) {
        setImportError(err.message || "An error occurred during import.");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      setImportError("Failed to read the file.");
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  // OMDb entries state (to load genres dynamically)
  const [entriesWithOmdb, setEntriesWithOmdb] = useState<(DiaryEntry & { genres?: string[] })[]>([]);
  const [loadingOmdb, setLoadingOmdb] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAllOmdb = async () => {
      setLoadingOmdb(true);
      const updated = await Promise.all(
        entries.map(async (entry) => {
          try {
            const data = await getOmdbData(
              entry.tmdb_id,
              entry.title,
              entry.year,
              entry.media_type,
              String(entry.rating * 2)
            );
            if (active && data && data.Genre && data.Genre !== "N/A") {
              const genres = data.Genre.split(",").map((g: string) => g.trim());
              return { ...entry, genres };
            }
          } catch (err) {
            console.error("Failed to load OMDb data for entry:", entry.title, err);
          }
          return { ...entry, genres: [] };
        })
      );
      if (active) {
        setEntriesWithOmdb(updated);
        setLoadingOmdb(false);
      }
    };
    fetchAllOmdb();
    return () => {
      active = false;
    };
  }, [entries]);

  // Extract dynamic filters
  const diaryYears = useMemo(() => {
    const years = new Set<string>();
    entries.forEach((e) => {
      const parts = normalizeWatchedOn(e.watched_on).split(" ");
      const y = parts[2];
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const movieDecades = useMemo(() => {
    const decades = new Set<number>();
    entries.forEach((e) => {
      if (e.year) {
        decades.add(Math.floor(e.year / 10) * 10);
      }
    });
    return Array.from(decades).sort((a, b) => b - a);
  }, [entries]);

  const allGenres = useMemo(() => {
    const genresSet = new Set<string>();
    entriesWithOmdb.forEach((entry) => {
      if (entry.genres) {
        entry.genres.forEach((g) => genresSet.add(g));
      }
    });
    return Array.from(genresSet).sort();
  }, [entriesWithOmdb]);

  // Handle Filtering & Sorting
  const filteredEntries = useMemo(() => {
    let result = [...entriesWithOmdb];

    if (ratingFilter !== "all") {
      result = result.filter((e) => e.rating === parseFloat(ratingFilter));
    }

    if (diaryYearFilter !== "all") {
      result = result.filter((e) => {
        const parts = normalizeWatchedOn(e.watched_on).split(" ");
        return parts[2] === diaryYearFilter;
      });
    }

    if (decadeFilter !== "all") {
      const dec = parseInt(decadeFilter);
      result = result.filter((e) => {
        if (!e.year) return false;
        return Math.floor(e.year / 10) * 10 === dec;
      });
    }

    if (genreFilter !== "all") {
      result = result.filter((e) => e.genres && e.genres.includes(genreFilter));
    }

    if (typeFilter !== "all") {
      result = result.filter((e) => e.media_type === typeFilter);
    }

    // Sort by watched date
    result.sort((a, b) => {
      const dateA = new Date(normalizeWatchedOn(a.watched_on)).getTime();
      const dateB = new Date(normalizeWatchedOn(b.watched_on)).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [entriesWithOmdb, ratingFilter, diaryYearFilter, decadeFilter, genreFilter, typeFilter, sortOrder]);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  let lastMonthYear = "";

  return (
    <div className="space-y-6">
      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        {/* Left: Export / Import buttons */}
        <div className="flex items-center gap-2">
          {/* Export */}
          <button
            onClick={() => exportToCSV(entries)}
            className="flex items-center gap-1.5 bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest transition-all select-none cursor-pointer"
            title="Export diary as CSV file"
          >
            <Download className="h-3 w-3 text-[#00e054]" />
            Export
          </button>
          
          {/* Import */}
          <label className="flex items-center gap-1.5 bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest transition-all select-none cursor-pointer">
            <Upload className="h-3 w-3 text-[#40bcf4]" />
            Import
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>
        </div>

        {/* Right: filter buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Type */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 pr-8 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00e054]/40 transition-all select-none"
            >
              <option value="all">TYPE</option>
              <option value="movie">MOVIE</option>
              <option value="tv">TV SERIES</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Rating */}
          <div className="relative">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="appearance-none bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 pr-8 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00e054]/40 transition-all select-none"
            >
              <option value="all">RATING</option>
              {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map((val) => (
                <option key={val} value={val}>{val} ★</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Diary Year */}
          <div className="relative">
            <select
              value={diaryYearFilter}
              onChange={(e) => setDiaryYearFilter(e.target.value)}
              className="appearance-none bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 pr-8 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00e054]/40 transition-all select-none"
            >
              <option value="all">DIARY YEAR</option>
              {diaryYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Decade */}
          <div className="relative">
            <select
              value={decadeFilter}
              onChange={(e) => setDecadeFilter(e.target.value)}
              className="appearance-none bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 pr-8 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00e054]/40 transition-all select-none"
            >
              <option value="all">DECADE</option>
              {movieDecades.map((dec) => (
                <option key={dec} value={dec}>{dec}s</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Genre */}
          <div className="relative">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="appearance-none bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 pr-8 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00e054]/40 transition-all select-none"
            >
              <option value="all">GENRE</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort Toggler */}
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="flex items-center gap-1.5 bg-[#1c2228] border border-border/40 hover:border-border rounded-md px-3 py-1.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-white uppercase tracking-widest transition-all select-none cursor-pointer"
          >
            Sort by WATCHED DATE {sortOrder === "desc" ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {/* ── Table Layout ── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-muted-foreground min-w-[700px]">
          <thead>
            <tr className="border-b border-border/60 text-[9px] font-bold uppercase tracking-widest text-[#678] h-10 select-none">
              <th className="w-20 text-center">Month</th>
              <th className="w-12 text-center">Day</th>
              <th className="pl-4">Film</th>
              <th className="w-20 text-center">Released</th>
              <th className="w-32 text-center">Rating</th>
              <th className="w-12 text-center">Like</th>
              <th className="w-16 text-center">Rewatch</th>
              <th className="w-16 text-center">Review</th>
              <th className="w-20 text-center pr-2">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filteredEntries.slice(0, visibleCount).map((entry) => {
              // Parse date parts (normalize ISO format)
              const parts = normalizeWatchedOn(entry.watched_on).split(" ");
              const day = parts[0] || "";
              const month = parts[1] || "";
              const year = parts[2] || "";
              
              const currentMonthYear = `${month} ${year}`;
              let showMonthBadge = false;
              
              if (currentMonthYear !== lastMonthYear) {
                showMonthBadge = true;
                lastMonthYear = currentMonthYear;
              }
              
              const isTV = entry.media_type === "tv";
              const href = isTV ? `/tv/${entry.tmdb_id}` : `/movie/${entry.tmdb_id}`;
              
              return (
                <tr
                  key={entry.id}
                  className="hover:bg-[#1c2228]/30 transition-colors h-16 group/row"
                >
                  {/* Month badge */}
                  <td className="align-middle text-center w-20">
                    {showMonthBadge && (
                      <div className="flex flex-col items-center justify-center w-16 h-13 rounded bg-[#1c2228] border border-border/40 border-t-4 border-t-[#00e054] text-center select-none shadow-md mx-auto">
                        <div className="text-[10px] font-black tracking-widest text-white uppercase leading-none mt-1">{month.substring(0, 3)}</div>
                        <div className="text-[9px] font-bold text-muted-foreground mt-1 leading-none mb-1">{year}</div>
                      </div>
                    )}
                  </td>
                  
                  {/* Day number */}
                  <td className="align-middle text-center text-lg font-bold text-muted-foreground/80 tabular-nums">
                    {day}
                  </td>
                  
                  {/* Film Poster & Title */}
                  <td className="align-middle pl-4">
                    <div className="flex items-center gap-3">
                      {/* Poster */}
                      <Link href={href} className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded border border-border/60 hover:border-[#00e054] transition-colors shadow">
                        <Image
                          src={getPosterUrl(entry.poster_path, "w185")}
                          alt={entry.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </Link>
                      
                      {/* Title */}
                      <div className="min-w-0">
                        <Link href={href} className="text-sm font-extrabold text-white hover:text-[#00e054] transition-colors truncate block">
                          {entry.title}
                        </Link>
                        {!isTV ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-[#00e054]/10 px-1.5 py-0.5 text-[8px] font-semibold text-[#00e054] mt-0.5 select-none leading-none">
                            <Film className="h-2 w-2" /> Movie
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-[#40bcf4]/10 px-1.5 py-0.5 text-[8px] font-semibold text-[#40bcf4] mt-0.5 select-none leading-none">
                            <Tv className="h-2 w-2" /> TV Series
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Release Year */}
                  <td className="align-middle text-center font-bold text-muted-foreground/80">
                    {entry.year || "—"}
                  </td>
                  
                  {/* Stars rating */}
                  <td className="align-middle text-center">
                    <TableStarRating
                      entryId={entry.id!}
                      initialRating={entry.rating}
                      onRefresh={onRefresh}
                    />
                  </td>
                  
                  {/* Like */}
                  <td className="align-middle text-center">
                    <TableLikeToggle
                      entryId={entry.id!}
                      initialLiked={entry.liked}
                      onRefresh={onRefresh}
                    />
                  </td>
                  
                  {/* Rewatch */}
                  <td className="align-middle text-center">
                    {entry.watched_before && (
                      <RotateCcw className="h-3.5 w-3.5 text-[#40bcf4] mx-auto select-none" />
                    )}
                  </td>
                  
                  {/* Review snippet icon */}
                  <td className="align-middle text-center">
                    {entry.review ? (
                      <div className="relative group/tooltip inline-block">
                        <MessageSquare className="h-3.5 w-3.5 text-[#9ab] hover:text-[#00e054] transition-colors mx-auto cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded bg-black/95 text-white border border-border text-[10px] leading-relaxed shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 text-left">
                          {entry.review}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  
                  {/* Edit / Actions */}
                  <td className="align-middle text-center pr-2">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(entry);
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded-full bg-black/40 text-muted-foreground hover:text-[#00e054] hover:bg-black/60 transition-colors cursor-pointer"
                        title="Edit entry"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(entry.id!, e)}
                        className="h-7 w-7 flex items-center justify-center rounded-full bg-black/40 text-muted-foreground hover:text-red-400 hover:bg-black/60 transition-colors cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Trigger */}
      {visibleCount < filteredEntries.length && (
        <div
          ref={setLoadMoreTrigger}
          className="flex justify-center items-center py-6 w-full select-none"
        >
          <Loader2 className="h-5 w-5 animate-spin text-[#00e054] mr-2" />
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Loading more entries...</span>
        </div>
      )}
      
      {filteredEntries.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-lg">
          <p className="text-sm text-muted-foreground">No movies found matching the selected filters.</p>
        </div>
      )}

      {/* ── Custom Deletion Confirmation Dialog ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c242c] border border-border/80 max-w-md w-full rounded-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-white tracking-wide uppercase mb-3 text-red-500 select-none">
              Remove from Diary?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 select-none">
              Are you sure you want to delete this movie log from your personal diary? This action is permanent and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-[#9ab] hover:text-white bg-transparent hover:bg-white/5 transition-all select-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteConfirmId) {
                    await deleteDiaryEntry(deleteConfirmId);
                    setDeleteConfirmId(null);
                    onDelete();
                  }
                }}
                className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all select-none cursor-pointer shadow-lg shadow-red-600/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Import Status/Result Dialog ── */}
      {(importResult || importError || importing) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c242c] border border-border/80 max-w-md w-full rounded-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            {importing && (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#00e054]" />
                <p className="text-sm font-semibold text-white uppercase tracking-wider select-none">Importing diary data...</p>
                <p className="text-xs text-muted-foreground select-none">Parsing CSV and matching with TMDB metadata...</p>
              </div>
            )}

            {importError && (
              <div>
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase mb-3 text-red-500 select-none">
                  Import Failed
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 select-none">
                  {importError}
                </p>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setImportError(null)}
                    className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all select-none cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {importResult && (
              <div>
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase mb-3 text-[#00e054] select-none">
                  Import Complete
                </h3>
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-white select-none">
                    Your movie diary has been successfully updated.
                  </p>
                  <div className="grid grid-cols-2 gap-4 bg-[#14181c]/50 p-3 rounded border border-border/20 text-xs">
                    <div className="text-center p-2 select-none">
                      <div className="text-lg font-black text-[#00e054]">{importResult.success}</div>
                      <div className="text-muted-foreground uppercase font-semibold text-[9px] tracking-wider mt-1">Imported</div>
                    </div>
                    <div className="text-center p-2 border-l border-border/20 select-none">
                      <div className="text-lg font-black text-red-400">{importResult.failed}</div>
                      <div className="text-muted-foreground uppercase font-semibold text-[9px] tracking-wider mt-1">Failed</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setImportResult(null)}
                    className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-white bg-[#00c030] hover:bg-[#00e054] active:scale-95 transition-all select-none cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
