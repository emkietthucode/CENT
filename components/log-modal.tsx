"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, Heart, Loader2, Tv, Film } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { searchMovies, fetchMovieDetails, getDirector, getYear, getPosterUrl } from "@/lib/tmdb";
import { addDiaryEntry, updateDiaryEntry, deleteDiaryEntry, STATIC_USER_ID, supabase } from "@/lib/supabase";
import type { TMDBMovie, TMDBMovieDetail, TMDBSeason, DiaryEntry } from "@/types";
import { DatePicker } from "@/components/date-picker";

// ─── Tháng tĩnh — tránh lỗi hydration do locale khác giữa Node.js và browser ──
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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

// ─── Half-star Rating Component ───────────────────────────────────────────────
// Hỗ trợ 0.5 step: click/hover nửa trái star = X.5, nửa phải = X
// Dùng SVG clip-path để vẽ nửa sao
const STAR_PATH = "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z";

interface StarRatingProps {
  rating: number;
  onRatingChange: (r: number) => void;
}

function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  // Phát hiện nửa trái hay nửa phải của ngôi sao
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
            {/* Nền: sao rỗng */}
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-7 w-7 text-[#678]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
            </svg>

            {/* Overlay: sao đầy hoặc nửa sao */}
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

      {/* Hiển thị giá trị số */}
      <span className="ml-2 min-w-[32px] text-xs tabular-nums text-[#9ab]">
        {display > 0 ? `${display}/5` : ""}
      </span>
    </div>
  );
}

// ─── Log Modal ────────────────────────────────────────────────────────────────

interface LogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editEntry?: DiaryEntry | null;
  initialMedia?: any;
}

type TMDBMovieDetailWithSeasons = TMDBMovieDetail & {
  seasons?: TMDBSeason[];
};

export function LogModal({ open, onOpenChange, onSaved, editEntry, initialMedia }: LogModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Step 2: Selected item
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovieDetailWithSeasons | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state — watchedOn khởi tạo rỗng, set trong useEffect để tránh hydration mismatch
  const [watchedOn, setWatchedOn] = useState("");
  const [watchedBefore, setWatchedBefore] = useState(false);
  const [review, setReview] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // State quản lý season chọn (TV series nhiều season)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  // Customizations
  const [customSeasonNames, setCustomSeasonNames] = useState<Record<string, string>>({});
  const [customPosterPath, setCustomPosterPath] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);

  // Set ngày tháng chỉ phía client (fix hydration mismatch)
  useEffect(() => {
    setMounted(true);
    if (!watchedOn) setWatchedOn(formatDate(new Date()));
  }, []);

  const isTV = (selectedMovie as any)?.media_type === "tv";
  const numSeasons = selectedMovie?.number_of_seasons ?? 0;

  // Pre-fill form when editEntry or initialMedia is provided
  useEffect(() => {
    if (open) {
      if (editEntry) {
        // Tải customizations và chi tiết phim cho edit entry
        async function loadEditDetails() {
          setDetailLoading(true);
          try {
            const type = editEntry.media_type === "tv" ? "tv" : "movie";
            const detail = await fetchMovieDetails(editEntry.tmdb_id, type);
            const detailWithSeasons = detail as TMDBMovieDetailWithSeasons;

            const { getMediaCustomization } = await import("@/lib/supabase");
            const customization = await getMediaCustomization(editEntry.tmdb_id, editEntry.media_type);

            let finalSeasons = detailWithSeasons.seasons || [];

            if (customization) {
              setCustomSeasonNames(customization.custom_season_names || {});
              setCustomPosterPath(customization.custom_poster_path || null);

              if (type === "tv" && customization.season_group_id) {
                const { fetchTVEpisodeGroupDetails } = await import("@/lib/tmdb");
                try {
                  const groupDetails = await fetchTVEpisodeGroupDetails(customization.season_group_id);
                  if (groupDetails && groupDetails.groups) {
                    finalSeasons = groupDetails.groups.map((g: any) => ({
                      id: g.id ? parseInt(String(g.id).replace(/\D/g, '')) || Math.floor(Math.random() * 100000) : Math.floor(Math.random() * 100000),
                      name: g.name,
                      overview: g.overview || "",
                      season_number: g.order || 1,
                      air_date: g.episodes?.[0]?.air_date || null,
                      poster_path: g.poster_path || null,
                      episode_count: g.episodes?.length || 0,
                    }));
                  }
                } catch (err) {
                  console.error("Error fetching custom season group in edit mode:", err);
                }
              }
            } else {
              setCustomSeasonNames({});
              setCustomPosterPath(null);
            }

            setSelectedMovie({
              ...detailWithSeasons,
              media_type: editEntry.media_type,
              seasons: finalSeasons,
              poster_path: customization?.custom_poster_path || detailWithSeasons.poster_path
            });
          } catch (err) {
            console.error("Failed to load details for edit:", err);
            // Fallback
            setSelectedMovie({
              id: editEntry.tmdb_id,
              title: editEntry.title.split(" — Season")[0],
              release_date: editEntry.year ? `${editEntry.year}-01-01` : "",
              poster_path: editEntry.poster_path,
              media_type: editEntry.media_type,
              credits: { cast: [], crew: [] }
            } as any);
          } finally {
            setDetailLoading(false);
          }
        }
        loadEditDetails();

        setWatchedOn(editEntry.watched_on);
        setWatchedBefore(editEntry.watched_before);
        setReview(editEntry.review);
        setTags(editEntry.tags ? editEntry.tags.join(", ") : "");
        setRating(editEntry.rating);
        setLiked(editEntry.liked);
        setSelectedSeason(editEntry.season_number ?? null);
        setStep(2);
      } else if (initialMedia) {
        // Tải chi tiết cho initialMedia
        async function loadInitialMedia() {
          setDetailLoading(true);
          try {
            const type = initialMedia.media_type === "tv" ? "tv" : "movie";
            const detail = await fetchMovieDetails(initialMedia.id, type);
            const detailWithSeasons = detail as TMDBMovieDetailWithSeasons;

            const { getMediaCustomization } = await import("@/lib/supabase");
            const customization = await getMediaCustomization(initialMedia.id, type);

            let finalSeasons = detailWithSeasons.seasons || [];

            if (customization) {
              setCustomSeasonNames(customization.custom_season_names || {});
              setCustomPosterPath(customization.custom_poster_path || null);

              if (type === "tv" && customization.season_group_id) {
                const { fetchTVEpisodeGroupDetails } = await import("@/lib/tmdb");
                try {
                  const groupDetails = await fetchTVEpisodeGroupDetails(customization.season_group_id);
                  if (groupDetails && groupDetails.groups) {
                    finalSeasons = groupDetails.groups.map((g: any) => ({
                      id: g.id ? parseInt(String(g.id).replace(/\D/g, '')) || Math.floor(Math.random() * 100000) : Math.floor(Math.random() * 100000),
                      name: g.name,
                      overview: g.overview || "",
                      season_number: g.order || 1,
                      air_date: g.episodes?.[0]?.air_date || null,
                      poster_path: g.poster_path || null,
                      episode_count: g.episodes?.length || 0,
                    }));
                  }
                } catch (err) {
                  console.error("Error fetching custom season group for initialMedia:", err);
                }
              }
            } else {
              setCustomSeasonNames({});
              setCustomPosterPath(null);
            }

            setSelectedMovie({
              ...detailWithSeasons,
              media_type: type,
              seasons: finalSeasons,
              poster_path: customization?.custom_poster_path || detailWithSeasons.poster_path
            });
            setStep(2);
          } catch (err) {
            console.error("Failed to load initial media detail:", err);
            setSelectedMovie({
              id: initialMedia.id,
              title: initialMedia.title,
              release_date: initialMedia.release_date || "",
              poster_path: initialMedia.poster_path,
              media_type: initialMedia.media_type,
            } as any);
            setStep(2);
          } finally {
            setDetailLoading(false);
          }
        }
        loadInitialMedia();
      } else {
        resetForm();
      }
    }
  }, [open, editEntry, initialMedia]);

  // Tự động gán selectedSeason mặc định là 1 khi chọn TV series nhiều season ở Step 2
  useEffect(() => {
    if (selectedMovie && isTV && numSeasons > 1 && !editEntry) {
      setSelectedSeason(1);
    } else if (!isTV || numSeasons <= 1) {
      setSelectedSeason(null);
    }
  }, [selectedMovie, isTV, numSeasons, editEntry]);

  // Tự động tải dữ liệu cũ của Season khi user chuyển đổi season trong LogModal (chỉ ở chế độ add mới)
  useEffect(() => {
    if (selectedMovie && isTV && numSeasons > 1 && selectedSeason !== null && !editEntry) {
      async function loadSeasonData() {
        const { data, error } = await supabase
          .from("diary_entries")
          .select("*")
          .eq("user_id", STATIC_USER_ID)
          .eq("tmdb_id", selectedMovie.id)
          .eq("season_number", selectedSeason)
          .maybeSingle();

        if (!error && data) {
          // Pre-fill dữ liệu của season đã có
          setRating(data.rating ?? 0);
          setLiked(data.liked ?? false);
          setReview(data.review ?? "");
          setWatchedOn(data.watched_on ?? watchedOn);
        } else {
          // Reset form về trống để thêm mới season đó
          setRating(0);
          setLiked(false);
          setReview("");
        }
      }
      loadSeasonData();
    }
  }, [selectedSeason, selectedMovie, isTV, numSeasons, editEntry]);

  // Search debounce 350ms
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try { setSearchResults(await searchMovies(searchQuery)); }
      catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const resetForm = () => {
    setStep(1); setSearchQuery(""); setSearchResults([]);
    setSelectedMovie(null); setWatchedOn(formatDate(new Date()));
    setWatchedBefore(false); setReview(""); setTags("");
    setRating(0); setLiked(false); setSaving(false); setDeleting(false);
    setSelectedSeason(null);
    setCustomSeasonNames({});
    setCustomPosterPath(null);
  };

  const handleClose = () => { resetForm(); onOpenChange(false); };

  const handleSelectMovie = async (item: TMDBMovie) => {
    setDetailLoading(true);
    try {
      const type = item.media_type === "tv" ? "tv" : "movie";
      const detail = await fetchMovieDetails(item.id, type);
      const detailWithSeasons = detail as TMDBMovieDetailWithSeasons;

      // Load customization from database
      const { getMediaCustomization } = await import("@/lib/supabase");
      const customization = await getMediaCustomization(item.id, type);

      let finalSeasons = detailWithSeasons.seasons || [];

      if (customization) {
        setCustomSeasonNames(customization.custom_season_names || {});
        setCustomPosterPath(customization.custom_poster_path || null);

        // Nếu TV series dùng episode group tùy chỉnh, ta fetch details của group đó để lấy seasons
        if (type === "tv" && customization.season_group_id) {
          const { fetchTVEpisodeGroupDetails } = await import("@/lib/tmdb");
          try {
            const groupDetails = await fetchTVEpisodeGroupDetails(customization.season_group_id);
            if (groupDetails && groupDetails.groups) {
              finalSeasons = groupDetails.groups.map((g: any) => ({
                id: g.id ? parseInt(String(g.id).replace(/\D/g, '')) || Math.floor(Math.random() * 100000) : Math.floor(Math.random() * 100000),
                name: g.name,
                overview: g.overview || "",
                season_number: g.order || 1,
                air_date: g.episodes?.[0]?.air_date || null,
                poster_path: g.poster_path || null,
                episode_count: g.episodes?.length || 0,
              }));
            }
          } catch (err) {
            console.error("Error fetching custom season group in LogModal:", err);
          }
        }
      } else {
        setCustomSeasonNames({});
        setCustomPosterPath(null);
      }

      setSelectedMovie({
        ...detailWithSeasons,
        media_type: item.media_type,
        seasons: finalSeasons,
        poster_path: customization?.custom_poster_path || detailWithSeasons.poster_path
      });
      setStep(2);
    } catch (err) {
      console.error("Failed to load details in LogModal:", err);
      setSelectedMovie(item as any);
      setStep(2);
    } finally { setDetailLoading(false); }
  };

  const handleDelete = async () => {
    if (!editEntry?.id) return;
    if (!confirm("Are you sure you want to delete this log from your diary?")) return;
    
    setDeleting(true);
    const success = await deleteDiaryEntry(editEntry.id);
    setDeleting(false);
    
    if (success) {
      onSaved();
      handleClose();
    } else {
      alert("Delete failed. Please check your Supabase connection.");
    }
  };

  const handleSave = async () => {
    if (!selectedMovie) return;
    setSaving(true);
    const mediaType = (selectedMovie as any).media_type ?? "movie";

    const baseTitle = selectedMovie.title.split(" — Season")[0];
    
    // Tìm tên của season được chọn (bao gồm tên tùy chỉnh của người dùng hoặc tên từ Episode Group)
    let seasonName = `Season ${selectedSeason}`;
    if (selectedSeason !== null && selectedMovie.seasons) {
      const customName = customSeasonNames[String(selectedSeason)];
      const TMDBName = selectedMovie.seasons.find((s: any) => s.season_number === selectedSeason)?.name;
      seasonName = customName || TMDBName || `Season ${selectedSeason}`;
    }

    const finalTitle = (isTV && numSeasons > 1 && selectedSeason !== null)
      ? `${baseTitle} — ${seasonName}`
      : baseTitle;

    const finalYear = (isTV && numSeasons > 1 && selectedSeason !== null)
      ? getSeasonReleaseYear((selectedMovie as any).seasons, selectedSeason, getYear(selectedMovie.release_date))
      : getYear(selectedMovie.release_date);

    const entryData = {
      user_id: STATIC_USER_ID,
      tmdb_id: selectedMovie.id,
      media_type: mediaType,
      title: finalTitle,
      year: finalYear,
      poster_path: customPosterPath || selectedMovie.poster_path,
      director: getDirector(selectedMovie),
      watched_on: watchedOn,
      watched_before: false,
      review,
      tags: [] as string[],
      rating,
      liked,
      season_number: (isTV && numSeasons > 1) ? selectedSeason : null,
    };

    let saved = null;
    if (editEntry?.id) {
      // Sửa entry hiện tại
      saved = await updateDiaryEntry(editEntry.id, entryData);
    } else {
      // Check trùng log (Requirement 4)
      try {
        let query = supabase
          .from("diary_entries")
          .select("*")
          .eq("user_id", STATIC_USER_ID)
          .eq("tmdb_id", selectedMovie.id);

        if (isTV && numSeasons > 1 && selectedSeason !== null) {
          query = query.eq("season_number", selectedSeason);
        } else {
          query = query.is("season_number", null);
        }

        const { data: existingEntries, error: checkError } = await query.limit(1);

        if (!checkError && existingEntries && existingEntries.length > 0) {
          // Phim đã được log: Cập nhật thông tin và bật watched_before = true
          const existing = existingEntries[0];
          saved = await updateDiaryEntry(existing.id, {
            ...entryData,
            watched_before: true
          });
        } else {
          // Chưa log: thêm mới
          saved = await addDiaryEntry(entryData);
        }
      } catch (err) {
        console.error("Error duplicate check:", err);
        saved = await addDiaryEntry(entryData);
      }
    }

    setSaving(false);
    if (saved) { onSaved(); handleClose(); }
    else alert("Save failed. Please check your Supabase connection.");
  };

  const director = selectedMovie ? getDirector(selectedMovie) : "";
  const year = selectedMovie ? getYear(selectedMovie.release_date) : null;

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* sm:!max-w-[800px] ghi đè sm:max-w-lg trong DialogContent base class */}
      <DialogContent
        className="sm:!max-w-[800px] gap-0 overflow-hidden border border-border/30 bg-[#14181c] p-0 sm:rounded-lg shadow-2xl"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4 bg-[#182027]/40">
          <div className="flex items-center gap-3">
            {step === 2 && !editEntry && (
              <button
                onClick={() => { setStep(1); setSelectedMovie(null); }}
                className="flex items-center gap-1 rounded bg-[#00c030] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#00e054] active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                BACK
              </button>
            )}
            <DialogTitle className="text-base font-extrabold uppercase tracking-widest text-white">
              {editEntry ? "Edit diary entry" : step === 1 ? "Add to diary" : "Log movie"}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Search for a movie or TV series, then set the season, watched date, rating, and review.
          </DialogDescription>
          <button onClick={handleClose} className="text-[#678] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="p-6">
          {step === 1 ? (
            /* ── Step 1: Search ── */
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-2xl">
                <Input
                  type="text"
                  placeholder="Search movies or TV series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full border border-border/40 bg-[#1c2228] text-white placeholder:text-[#678] focus-visible:ring-2 focus-visible:ring-[#00e054]"
                  autoFocus
                />
                {(searchLoading || detailLoading) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#00e054]" />
                )}
              </div>

              <p className="mt-2 text-xs text-[#678]">
                Supports Vietnamese, English, Chinese, Japanese, Korean and other languages
              </p>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-[340px] w-full max-w-2xl overflow-y-auto rounded bg-[#1c2228] border border-border/40 divide-y divide-border/20">
                  {searchResults.map((item) => (
                    <button
                      key={`${item.media_type}-${item.id}`}
                      onClick={() => handleSelectMovie(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#2c3440]/30 transition-colors"
                    >
                      {/* Poster nhỏ */}
                      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded border border-border/30">
                        <Image
                          src={getPosterUrl(item.poster_path, "w185")}
                          alt={item.title}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-white truncate text-sm">{item.title}</p>
                          {/* Badge: TV Series hoặc Movie */}
                          {item.media_type === "tv" ? (
                            <span className="flex-shrink-0 flex items-center gap-1 rounded bg-[#40bcf4]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#40bcf4]">
                              <Tv className="h-3 w-3" /> TV
                            </span>
                          ) : (
                            <span className="flex-shrink-0 flex items-center gap-1 rounded bg-[#00e054]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#00e054]">
                              <Film className="h-3 w-3" /> Movie
                            </span>
                          )}
                        </div>

                        {/* Tên gốc (nếu khác tên tiếng Anh) */}
                        {item.original_title && item.original_title !== item.title && (
                          <p className="text-xs text-[#678] truncate">{item.original_title}</p>
                        )}

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getYear(item.release_date) ?? "N/A"}
                          {item.vote_average > 0 && (
                            <span className="ml-2 text-[#00e054] font-semibold">★ {item.vote_average.toFixed(1)}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
                <p className="mt-6 text-sm text-[#678]">
                  No results found for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          ) : (
            /* ── Step 2: Log Entry ── */
            <div className="flex gap-6">
              {/* Poster */}
              <div className="relative h-[300px] w-[200px] flex-shrink-0 overflow-hidden rounded shadow-2xl border border-border/20">
                {selectedMovie && (
                  <Image
                    src={getPosterUrl(selectedMovie.poster_path, "w342")}
                    alt={selectedMovie.title}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                )}
              </div>

              {/* Form */}
              <div className="flex-1 space-y-5 min-w-0">
                {/* Title + Type Badge */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                      {selectedMovie?.title}
                    </h2>
                    {year && <span className="text-lg font-bold text-[#9ab]">{year}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {isTV ? (
                      <span className="flex items-center gap-1 rounded bg-[#40bcf4]/20 px-2 py-0.5 text-[10px] font-bold text-[#40bcf4] uppercase tracking-wider">
                        <Tv className="h-3 w-3" /> TV Series
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded bg-[#00e054]/10 px-2 py-0.5 text-[10px] font-bold text-[#00e054] uppercase tracking-wider">
                        <Film className="h-3 w-3" /> Movie
                      </span>
                    )}
                    {director && director !== "Unknown" && (
                      <span className="text-xs text-muted-foreground">
                        {isTV ? "Created by" : "Directed by"}{" "}
                        <span className="text-white font-medium">{director}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Season selection & Date picker Row */}
                <div className="flex flex-wrap items-center gap-3.5">
                  
                  {/* Watched On */}
                  <div className="flex items-center gap-2.5 bg-[#2c3440]/30 rounded-md px-3.5 py-1.5 border border-border/30">
                    <span className="text-xs font-semibold text-[#9ab] uppercase tracking-wider">Watched on</span>
                    <DatePicker
                      value={watchedOn}
                      onChange={(dateStr) => setWatchedOn(dateStr)}
                    />
                  </div>
                  
                  {/* Dropdown Season Selection (Chỉ TV series nhiều season) */}
                  {isTV && numSeasons > 1 && (
                    <div className="flex items-center gap-2.5 bg-[#2c3440]/30 rounded-md px-3.5 py-1.5 border border-border/30">
                      <span className="text-xs font-semibold text-[#9ab] uppercase tracking-wider">Season</span>
                      <select
                        value={selectedSeason ?? 1}
                        onChange={(e) => setSelectedSeason(Number(e.target.value))}
                        className="bg-[#1c2228] text-xs font-bold text-white border border-border/30 rounded px-2.5 py-1 focus:outline-none focus:border-[#00e054] transition-colors cursor-pointer"
                      >
                        {Array.from({ length: numSeasons }, (_, i) => i + 1).map((s) => {
                          const customName = customSeasonNames[String(s)];
                          const TMDBName = selectedMovie.seasons?.find((x: any) => x.season_number === s)?.name;
                          const label = customName || TMDBName || `Season ${s}`;
                          return (
                            <option key={s} value={s}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}  
                </div>

                {/* Review */}
                <textarea
                  placeholder="Write your review..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="h-28 w-full resize-none rounded-md border border-border/30 bg-[#1c2228] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#00e054] focus:ring-1 focus:ring-[#00e054]/30 transition-all duration-200"
                />

                {/* Rating + Like Box */}
                <div className="flex items-center gap-6 bg-[#2c3440]/35 rounded-lg px-5 py-3.5 border border-border/30 max-w-sm">
                  {/* Rating */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="text-[10px] font-bold text-[#9ab] uppercase tracking-wider">Rating</span>
                    <div className="flex items-center h-8">
                      <StarRating rating={rating} onRatingChange={setRating} />
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div className="w-[1px] h-9 bg-border/40" />

                  {/* Like */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#9ab] uppercase tracking-wider text-center">Like</span>
                    <div className="flex items-center justify-center h-8 w-12">
                      <button 
                        type="button" 
                        onClick={() => setLiked(!liked)} 
                        className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-[#678] hover:text-[#ff8000]"
                        title="Like this film"
                      >
                        <Heart
                          className={`h-6 w-6 transition-colors ${
                            liked ? "fill-[#ff8000] text-[#ff8000]" : "fill-transparent currentColor"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer: Save & Delete buttons ── */}
        {step === 2 && (
          <div className="flex justify-between items-center border-t border-border/40 px-5 py-4 w-full bg-[#182027]/40">
            <div>
              {editEntry && (
                <button
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="flex items-center gap-2 rounded bg-red-600 hover:bg-red-500 px-5 py-2.5 font-bold uppercase tracking-wider text-white disabled:opacity-60 active:scale-95 transition-all text-xs shadow-lg shadow-red-600/10"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete Log
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                className="flex items-center gap-2 rounded bg-[#00c030] px-6 py-2.5 font-bold uppercase tracking-wider text-white hover:bg-[#00e054] disabled:opacity-60 active:scale-95 transition-all text-xs"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save entry"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
