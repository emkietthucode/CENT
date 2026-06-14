"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { MovieCard } from "@/components/movie-grid";
import { topIMDBMovies } from "@/lib/top-imdb-data";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import { LogModal } from "@/components/log-modal";

export default function Top250IMDBPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [loading, setLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (visibleCount >= topIMDBMovies.length) return;
    setLoading(true);
    // 400ms loading simulation to display spinner smoothly
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 24, topIMDBMovies.length));
      setLoading(false);
    }, 400);
  }, [visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [loadMore, loading]);

  const visibleMovies = topIMDBMovies.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          // When searching from this page, redirect to home page with query param
          window.location.href = `/?search=${encodeURIComponent(q)}`;
        }}
        onLogClick={() => setLogModalOpen(true)}
      />

      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="mb-8 border-b border-border pb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide uppercase">Top 250 IMDb</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The greatest movies of all time, ranked based on actual IMDb scores
            </p>
          </div>
          <span className="text-sm font-semibold text-[#00e054] border border-[#00e054]/20 rounded-full px-4 py-1.5 bg-[#00e054]/5 select-none h-fit">
            {topIMDBMovies.length} MOVIES
          </span>
        </div>

        {/* 6 bộ một hàng */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visibleMovies.map((movie, index) => (
            <div key={movie.id} className="relative">
              {/* IMDb Rank badge */}
              <div className="absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#1c2228] border-2 border-[#00e054]/80 text-[#00e054] font-black text-xs shadow-lg select-none leading-none">
                {index + 1}
              </div>
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        {/* Observer target element */}
        <div ref={observerTarget} className="h-24 flex items-center justify-center mt-8">
          {loading && visibleCount < topIMDBMovies.length ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-[#00e054]" />
              <span className="text-sm">Loading more movies...</span>
            </div>
          ) : visibleCount >= topIMDBMovies.length ? (
            <p className="text-xs text-muted-foreground select-none">You have reached the end of the Top 250 IMDb list</p>
          ) : null}
        </div>
      </main>

      <LogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        onSaved={() => {
          console.log("Logged entry saved successfully!");
        }}
      />

      <Footer />
    </div>
  );
}
