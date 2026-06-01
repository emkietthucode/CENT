"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, ChevronLeft, Star, Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { movies, Movie } from "@/lib/movies";

export interface DiaryEntry {
  movie: Movie;
  watchedOn: string;
  watchedBefore: boolean;
  review: string;
  tags: string[];
  rating: number;
  liked: boolean;
}

interface LogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: DiaryEntry) => void;
}

export function LogModal({ open, onOpenChange, onSave }: LogModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  // Step 2 form state
  const [watchedOn, setWatchedOn] = useState(formatDate(new Date()));
  const [watchedBefore, setWatchedBefore] = useState(false);
  const [review, setReview] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return movies.filter(
      (movie) =>
        movie.title.toLowerCase().includes(query) ||
        movie.director.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const resetForm = () => {
    setStep(1);
    setSearchQuery("");
    setSelectedMovie(null);
    setWatchedOn(formatDate(new Date()));
    setWatchedBefore(false);
    setReview("");
    setTags("");
    setRating(0);
    setLiked(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedMovie(null);
  };

  const handleSave = () => {
    if (!selectedMovie) return;
    
    const entry: DiaryEntry = {
      movie: selectedMovie,
      watchedOn,
      watchedBefore,
      review,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      rating,
      liked,
    };
    
    onSave(entry);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[650px] gap-0 overflow-hidden border-none bg-[#456] p-0 sm:rounded-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#567] px-5 py-4">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 rounded bg-[#00c030] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#00e054] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                BACK
              </button>
            )}
            <DialogTitle className="text-lg font-semibold text-white">
              {step === 1 ? "Add to your films..." : "I watched..."}
            </DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="text-[#9ab] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="flex flex-col items-center">
              <Input
                type="text"
                placeholder="Search for film..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full max-w-md border-none bg-white text-[#456] placeholder:text-[#9ab] focus-visible:ring-2 focus-visible:ring-[#00e054]"
                autoFocus
              />
              
              {/* Search Results */}
              {filteredMovies.length > 0 && (
                <div className="mt-4 max-h-[300px] w-full max-w-md overflow-y-auto rounded bg-[#2c3440]">
                  {filteredMovies.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => handleSelectMovie(movie)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#384450] transition-colors"
                    >
                      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded">
                        <Image
                          src={movie.posterUrl}
                          alt={movie.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white">{movie.title}</p>
                        <p className="text-sm text-[#9ab]">
                          {movie.year} &middot; {movie.director}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Movie Poster */}
              <div className="relative h-[280px] w-[185px] flex-shrink-0 overflow-hidden rounded">
                {selectedMovie && (
                  <Image
                    src={selectedMovie.posterUrl}
                    alt={selectedMovie.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              {/* Form */}
              <div className="flex-1 space-y-4">
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {selectedMovie?.title}{" "}
                    <span className="text-[#9ab]">{selectedMovie?.year}</span>
                  </h2>
                </div>

                {/* Watched On & Before */}
                <div className="flex flex-wrap items-center gap-6">
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
                      className="rounded bg-[#567] px-2 py-1 text-sm text-white"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={watchedBefore}
                      onCheckedChange={(checked) =>
                        setWatchedBefore(checked === true)
                      }
                      className="h-5 w-5 border-[#678] data-[state=checked]:bg-[#00e054] data-[state=checked]:border-[#00e054]"
                    />
                    <span className="text-sm text-[#9ab]">
                      I&apos;ve watched this before
                    </span>
                  </label>
                </div>

                {/* Review */}
                <textarea
                  placeholder="Add a review..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="h-24 w-full resize-none rounded border-none bg-[#567] px-3 py-2 text-sm text-white placeholder:text-[#9ab] focus:outline-none focus:ring-2 focus:ring-[#00e054]"
                />

                {/* Tags & Rating Row */}
                <div className="flex flex-wrap items-end gap-6">
                  {/* Tags */}
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Tags</span>
                      <span className="text-xs text-[#9ab]">
                        Press Tab to complete, Enter to create
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="eg. netflix"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="h-10 border-none bg-[#567] text-white placeholder:text-[#9ab]"
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Rating</span>
                      <span className="text-xs text-[#9ab]">
                        {rating > 0 ? `${rating} out of 5` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star === rating ? 0 : star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= (hoverRating || rating)
                                ? "fill-[#00e054] text-[#00e054]"
                                : "fill-transparent text-[#678]"
                            } transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Like */}
                  <div>
                    <span className="mb-1 block text-sm font-medium text-white">
                      Like
                    </span>
                    <button
                      onClick={() => setLiked(!liked)}
                      className="p-0.5"
                    >
                      <Heart
                        className={`h-7 w-7 ${
                          liked
                            ? "fill-[#ff8000] text-[#ff8000]"
                            : "fill-transparent text-[#678]"
                        } transition-colors`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Save button (only on step 2) */}
        {step === 2 && (
          <div className="flex justify-end border-t border-[#567] px-5 py-4">
            <button
              onClick={handleSave}
              className="rounded bg-[#00c030] px-6 py-2 font-semibold text-white hover:bg-[#00e054] transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}
