"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, Heart, Loader2, Tv, Film } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { searchMovies, fetchMovieDetails, getDirector, getYear, getPosterUrl } from "@/lib/tmdb";
import { addDiaryEntry, updateDiaryEntry, deleteDiaryEntry, STATIC_USER_ID, supabase } from "@/lib/supabase";
import type { TMDBMovie, TMDBMovieDetail, DiaryEntry } from "@/types";

// ─── Tháng tĩnh — tránh lỗi hydration do locale khác giữa Node.js và browser ──
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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
}

export function LogModal({ open, onOpenChange, onSaved, editEntry }: LogModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Step 2: Selected item
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovieDetail | null>(null);
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

  const [mounted, setMounted] = useState(false);

  // Set ngày tháng chỉ phía client (fix hydration mismatch)
  useEffect(() => {
    setMounted(true);
    if (!watchedOn) setWatchedOn(formatDate(new Date()));
  }, []);

  // Pre-fill form when editEntry is provided
  useEffect(() => {
    if (open) {
      if (editEntry) {
        setSelectedMovie({
          id: editEntry.tmdb_id,
          title: editEntry.title,
          release_date: editEntry.year ? `${editEntry.year}-01-01` : "",
          poster_path: editEntry.poster_path,
          media_type: editEntry.media_type,
          credits: {
            cast: [],
            crew: [{ id: 0, name: editEntry.director, job: "Director", department: "Directing", profile_path: null }]
          }
        } as any);
        setWatchedOn(editEntry.watched_on);
        setWatchedBefore(editEntry.watched_before);
        setReview(editEntry.review);
        setTags(editEntry.tags ? editEntry.tags.join(", ") : "");
        setRating(editEntry.rating);
        setLiked(editEntry.liked);
        setStep(2);
      } else {
        resetForm();
      }
    }
  }, [open, editEntry]);

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
  };

  const handleClose = () => { resetForm(); onOpenChange(false); };

  const handleSelectMovie = async (item: TMDBMovie) => {
    setDetailLoading(true);
    try {
      const type = item.media_type === "tv" ? "tv" : "movie";
      const detail = await fetchMovieDetails(item.id, type);
      setSelectedMovie({ ...detail, media_type: item.media_type });
      setStep(2);
    } catch {
      // Fallback nếu lỗi detail
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
    const entryData = {
      user_id: STATIC_USER_ID,
      tmdb_id: selectedMovie.id,
      media_type: mediaType,
      title: selectedMovie.title,
      year: getYear(selectedMovie.release_date),
      poster_path: selectedMovie.poster_path,
      director: getDirector(selectedMovie),
      watched_on: watchedOn,
      watched_before: watchedBefore,
      review,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      rating,
      liked,
    };

    let saved = null;
    if (editEntry?.id) {
      // Sửa entry hiện tại
      saved = await updateDiaryEntry(editEntry.id, entryData);
    } else {
      // Check trùng log (Requirement 4)
      try {
        const { data: existingEntries, error: checkError } = await supabase
          .from("diary_entries")
          .select("*")
          .eq("user_id", STATIC_USER_ID)
          .eq("tmdb_id", selectedMovie.id)
          .limit(1);

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

  const isTV = (selectedMovie as any)?.media_type === "tv";
  const director = selectedMovie ? getDirector(selectedMovie) : "";
  const year = selectedMovie ? getYear(selectedMovie.release_date) : null;

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* sm:!max-w-[800px] ghi đè sm:max-w-lg trong DialogContent base class */}
      <DialogContent
        className="sm:!max-w-[800px] gap-0 overflow-hidden border-none bg-[#456] p-0 sm:rounded-lg"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[#567] px-5 py-4">
          <div className="flex items-center gap-3">
            {step === 2 && !editEntry && (
              <button
                onClick={() => { setStep(1); setSelectedMovie(null); }}
                className="flex items-center gap-1 rounded bg-[#00c030] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#00e054] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                BACK
              </button>
            )}
            <DialogTitle className="text-lg font-semibold text-white">
              {editEntry ? "Edit diary entry..." : step === 1 ? "Add to diary..." : "I've watched..."}
            </DialogTitle>
          </div>
          <button onClick={handleClose} className="text-[#9ab] hover:text-white transition-colors">
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
                  className="h-12 w-full border-none bg-white text-[#456] placeholder:text-[#9ab] focus-visible:ring-2 focus-visible:ring-[#00e054]"
                  autoFocus
                />
                {(searchLoading || detailLoading) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#456]" />
                )}
              </div>

              <p className="mt-2 text-xs text-[#9ab]">
                Supports Vietnamese, English, Chinese, Japanese, Korean and other languages
              </p>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-[340px] w-full max-w-2xl overflow-y-auto rounded bg-[#2c3440]">
                  {searchResults.map((item) => (
                    <button
                      key={`${item.media_type}-${item.id}`}
                      onClick={() => handleSelectMovie(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#384450] transition-colors"
                    >
                      {/* Poster nhỏ */}
                      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded">
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
                          <p className="font-medium text-white truncate">{item.title}</p>
                          {/* Badge: TV Series hoặc Movie */}
                          {item.media_type === "tv" ? (
                            <span className="flex-shrink-0 flex items-center gap-1 rounded bg-[#40bcf4]/20 px-1.5 py-0.5 text-xs text-[#40bcf4]">
                              <Tv className="h-3 w-3" /> TV Series
                            </span>
                          ) : (
                            <span className="flex-shrink-0 flex items-center gap-1 rounded bg-[#00e054]/10 px-1.5 py-0.5 text-xs text-[#00e054]">
                              <Film className="h-3 w-3" /> Movie
                            </span>
                          )}
                        </div>

                        {/* Tên gốc (nếu khác tên tiếng Anh) */}
                        {item.original_title && item.original_title !== item.title && (
                          <p className="text-xs text-[#7ab] truncate">{item.original_title}</p>
                        )}

                        <p className="text-sm text-[#9ab]">
                          {getYear(item.release_date) ?? "N/A"}
                          {item.vote_average > 0 && (
                            <span className="ml-2 text-[#00e054]">★ {item.vote_average.toFixed(1)}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
                <p className="mt-6 text-sm text-[#9ab]">
                  No results found for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          ) : (
            /* ── Step 2: Log Entry ── */
            <div className="flex gap-6">
              {/* Poster */}
              <div className="relative h-[280px] w-[185px] flex-shrink-0 overflow-hidden rounded shadow-lg">
                {selectedMovie && (
                  <Image
                    src={getPosterUrl(selectedMovie.poster_path, "w342")}
                    alt={selectedMovie.title}
                    fill
                    sizes="185px"
                    className="object-cover"
                  />
                )}
              </div>

              {/* Form */}
              <div className="flex-1 space-y-4 min-w-0">
                {/* Title + Type Badge */}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-white">
                      {selectedMovie?.title}
                      {year && <span className="ml-2 text-xl font-normal text-[#9ab]">{year}</span>}
                    </h2>
                    {isTV ? (
                      <span className="flex items-center gap-1 rounded bg-[#40bcf4]/20 px-2 py-0.5 text-xs font-medium text-[#40bcf4]">
                        <Tv className="h-3 w-3" /> TV Series
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded bg-[#00e054]/10 px-2 py-0.5 text-xs font-medium text-[#00e054]">
                        <Film className="h-3 w-3" /> Movie
                      </span>
                    )}
                  </div>
                  {director && director !== "Unknown" && (
                    <p className="mt-0.5 text-sm text-[#9ab]">
                      {isTV ? "Created by" : "Director"}:{" "}
                      <span className="text-white">{director}</span>
                    </p>
                  )}
                </div>

                {/* Watched On & Before */}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={true}
                      className="h-5 w-5 border-[#678] data-[state=checked]:bg-[#00e054] data-[state=checked]:border-[#00e054]"
                    />
                    <span className="text-sm text-[#9ab]">Watched on</span>
                    <input
                      type="text"
                      value={watchedOn}
                      onChange={(e) => setWatchedOn(e.target.value)}
                      className="rounded bg-[#567] px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e054]"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={watchedBefore}
                      onCheckedChange={(c) => setWatchedBefore(c === true)}
                      className="h-5 w-5 border-[#678] data-[state=checked]:bg-[#00e054] data-[state=checked]:border-[#00e054]"
                    />
                    <span className="text-sm text-[#9ab]">Watched before</span>
                  </label>
                </div>

                {/* Review */}
                <textarea
                  placeholder="Write your review..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="h-24 w-full resize-none rounded border-none bg-[#567] px-3 py-2 text-sm text-white placeholder:text-[#9ab] focus:outline-none focus:ring-2 focus:ring-[#00e054]"
                />

                {/* Tags + Rating + Like */}
                <div className="flex flex-wrap items-end gap-6">
                  {/* Tags */}
                  <div className="flex-1 min-w-[140px]">
                    <p className="mb-1 text-sm font-medium text-white">Tags</p>
                    <Input
                      placeholder="e.g., netflix, action"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="h-10 border-none bg-[#567] text-white placeholder:text-[#9ab]"
                    />
                  </div>

                  {/* Rating — half-star */}
                  <div>
                    <p className="mb-1 text-sm font-medium text-white">Rating</p>
                    <StarRating rating={rating} onRatingChange={setRating} />
                  </div>

                  {/* Like */}
                  <div>
                    <p className="mb-1 text-sm font-medium text-white">Like</p>
                    <button type="button" onClick={() => setLiked(!liked)} className="p-0.5">
                      <Heart
                        className={`h-7 w-7 transition-colors ${
                          liked ? "fill-[#ff8000] text-[#ff8000]" : "fill-transparent text-[#678]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer: Save & Delete buttons ── */}
        {step === 2 && (
          <div className="flex justify-between items-center border-t border-[#567] px-5 py-4 w-full">
            <div>
              {editEntry && (
                <button
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="flex items-center gap-2 rounded bg-[#ff3333] hover:bg-[#ff4d4d] px-5 py-2 font-semibold text-white disabled:opacity-60 active:scale-95 transition-all text-sm"
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
                className="flex items-center gap-2 rounded bg-[#00c030] px-6 py-2 font-semibold text-white hover:bg-[#00e054] disabled:opacity-60 active:scale-95 transition-all"
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
