"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { MovieGrid } from "@/components/movie-grid";
import { LogModal, DiaryEntry } from "@/components/log-modal";
import { DiarySection } from "@/components/diary-section";
import { movies, searchMovies } from "@/lib/movies";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) {
      return movies;
    }
    return searchMovies(searchQuery);
  }, [searchQuery]);

  const popularMovies = useMemo(() => {
    return [...movies]
      .sort((a, b) => parseFloat(b.views.replace(/[KM]/g, "")) - parseFloat(a.views.replace(/[KM]/g, "")))
      .slice(0, 6);
  }, []);

  const handleSaveDiaryEntry = (entry: DiaryEntry) => {
    setDiaryEntries((prev) => [entry, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogClick={() => setLogModalOpen(true)}
      />
      
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Browse filters bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-border pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Browse by
          </span>
          {["Year", "Rating", "Popular", "Genre"].map((filter) => (
            <button
              key={filter}
              className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-foreground hover:text-white transition-colors"
            >
              {filter}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Search results or default content */}
        {searchQuery.trim() ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium text-white">
                {filteredMovies.length > 0 
                  ? `Results for "${searchQuery}"` 
                  : `No results for "${searchQuery}"`}
              </h1>
              {filteredMovies.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {filteredMovies.length} film{filteredMovies.length !== 1 ? "s" : ""} found
                </span>
              )}
            </div>
            {filteredMovies.length > 0 && (
              <MovieGrid movies={filteredMovies} />
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* User's Diary Section */}
            {diaryEntries.length > 0 && (
              <DiarySection entries={diaryEntries} />
            )}

            {/* Popular Films Section */}
            <MovieGrid movies={popularMovies} title="Popular Films This Week" />
            
            {/* All Films Section */}
            <MovieGrid movies={movies} title="New on Filmboxd" />
          </div>
        )}
      </main>

      {/* Log Modal */}
      <LogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        onSave={handleSaveDiaryEntry}
      />

      {/* Footer */}
      <footer className="border-t border-border bg-[#0d1114] py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#ff8000]" />
                <span className="h-3 w-3 rounded-full bg-[#00e054]" />
                <span className="h-3 w-3 rounded-full bg-[#40bcf4]" />
              </div>
              <span className="text-sm font-semibold text-white">Filmboxd</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Film data from TMDB
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
