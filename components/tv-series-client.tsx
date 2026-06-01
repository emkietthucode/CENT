"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { MovieGrid, MovieCard } from "@/components/movie-grid";
import { LogModal } from "@/components/log-modal";
import {
  searchMovies,
  fetchTrendingTV,
  fetchTopRatedTVByYear,
  fetchLatestTVByCountry,
} from "@/lib/tmdb";
import { getOmdbData } from "@/lib/omdb";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { TMDBMovie } from "@/types";

interface TVSeriesClientProps {
  initialTrending: TMDBMovie[];
  initialOnTheAir: TMDBMovie[];
  initialTopRated: TMDBMovie[];
  initialLatestChina: TMDBMovie[];
}

export function TVSeriesClient({
  initialTrending,
  initialOnTheAir,
  initialTopRated,
  initialLatestChina,
}: TVSeriesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [logModalOpen, setLogModalOpen] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Trending state
  const [timeWindow, setTimeWindow] = useState<"day" | "week">("week");
  const [trendingMovies, setTrendingMovies] = useState<TMDBMovie[]>(initialTrending);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Now Playing state
  const [nowPlayingWindow, setNowPlayingWindow] = useState<"day" | "week">("week");

  // Top Rated state
  const [topRatedYear, setTopRatedYear] = useState<"all" | 2026>("all");
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBMovie[]>(initialTopRated);
  const [loadingTopRated, setLoadingTopRated] = useState(false);

  // Latest by Country state
  const [latestCountry, setLatestCountry] = useState<"china" | "korea" | "japan">("china");
  const [latestMovies, setLatestMovies] = useState<TMDBMovie[]>(initialLatestChina);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const carouselTrendingRef = useRef<HTMLDivElement>(null);
  const carouselNowPlayingRef = useRef<HTMLDivElement>(null);
  const carouselTopRatedRef = useRef<HTMLDivElement>(null);
  const carouselLatestRef = useRef<HTMLDivElement>(null);

  // ── Parse Search Query Parameter ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get("search");
      if (queryParam) {
        setSearchQuery(queryParam);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // ── Load Trending Data ──
  useEffect(() => {
    if (timeWindow === "week" && trendingMovies === initialTrending) return;

    const loadTrending = async () => {
      setLoadingTrending(true);
      try {
        const fetched = await fetchTrendingTV(timeWindow);
        setTrendingMovies(fetched);
      } catch (err) {
        console.error("Failed to load trending TV data:", err);
      } finally {
        setLoadingTrending(false);
      }
    };
    loadTrending();
  }, [timeWindow, initialTrending]);

  // ── Load Top Rated Data ──
  useEffect(() => {
    const loadTopRated = async () => {
      setLoadingTopRated(true);
      try {
        let fetched: TMDBMovie[] = [];
        if (topRatedYear === "all") {
          fetched = initialTopRated;
        } else {
          fetched = await fetchTopRatedTVByYear(topRatedYear);
        }

        // Fetch actual IMDb ratings for each TV series and sort them descending by IMDb rating!
        const withImdb = await Promise.all(
          fetched.map(async (m) => {
            const y = m.release_date ? parseInt(m.release_date.substring(0, 4)) : null;
            const data = await getOmdbData(m.id, m.title, y, "tv", String(m.vote_average));
            const ratingStr = data && data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : String(m.vote_average);
            const rating = parseFloat(ratingStr) || 7.5;
            return { ...m, imdbRating: rating };
          })
        );

        // Sort by actual IMDb rating descending
        const sorted = withImdb.sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0));
        setTopRatedMovies(sorted);
      } catch (err) {
        console.error("Failed to load top rated TV series:", err);
      } finally {
        setLoadingTopRated(false);
      }
    };
    loadTopRated();
  }, [topRatedYear, initialTopRated]);

  // ── Load Latest by Country ──
  useEffect(() => {
    if (latestCountry === "china" && latestMovies === initialLatestChina) return;

    const loadLatest = async () => {
      setLoadingLatest(true);
      try {
        const fetched = await fetchLatestTVByCountry(latestCountry);
        setLatestMovies(fetched);
      } catch (err) {
        console.error("Failed to load latest TV shows by country:", err);
      } finally {
        setLoadingLatest(false);
      }
    };
    loadLatest();
  }, [latestCountry, initialLatestChina]);

  // ── Realtime Search ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const results = await searchMovies(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = 600;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Now Playing Filter Logic
  const filteredNowPlaying = (() => {
    if (nowPlayingWindow === "day") {
      const now = new Date();
      return [...initialOnTheAir].filter((show) => {
        if (!show.release_date) return false;
        const relDate = new Date(show.release_date);
        const diffTime = now.getTime() - relDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 21; // TV series might stay "now playing" longer
      });
    }
    return initialOnTheAir;
  })();

  const finalNowPlaying = (() => {
    if (nowPlayingWindow === "day" && filteredNowPlaying.length < 5) {
      return [...initialOnTheAir].sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
        return dateB - dateA;
      });
    }
    return filteredNowPlaying;
  })();

  const topTrending = trendingMovies.slice(0, 10);
  const topNowPlaying = finalNowPlaying.slice(0, 10);
  const topTopRated = topRatedMovies.slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogClick={() => setLogModalOpen(true)}
      />

      <main className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Browse filters bar */}
        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border pb-4">
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

        {/* Content: search results OR home content */}
        {searchQuery.trim() ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium text-white">
                {loadingSearch
                  ? `Searching for "${searchQuery}"...`
                  : searchResults.length > 0
                  ? `Results for "${searchQuery}"`
                  : `No results found for "${searchQuery}"`}
              </h1>
              {!loadingSearch && searchResults.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
                </span>
              )}
            </div>
            {loadingSearch ? (
              <MovieGrid movies={[]} loading={true} />
            ) : (
              searchResults.length > 0 && <MovieGrid movies={searchResults} />
            )}
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* ── 1. SECTION TRENDING: Carousel Trượt ngang ── */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Trending TV Series
                </h2>
                
                {/* Capsules Toggles: Today / This Week */}
                <div className="flex items-center rounded-full border border-border/40 p-0.5 bg-[#14181c]/80 backdrop-blur-sm shadow-inner">
                  <button
                    onClick={() => setTimeWindow("day")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      timeWindow === "day"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setTimeWindow("week")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      timeWindow === "week"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    This Week
                  </button>
                </div>

                {loadingTrending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {/* Container Carousel */}
              <div className="relative group/carousel-trending w-full overflow-hidden">
                {/* Left navigation button */}
                <button
                  onClick={() => handleScroll(carouselTrendingRef, "left")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-trending:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right navigation button */}
                <button
                  onClick={() => handleScroll(carouselTrendingRef, "right")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-trending:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Right edge glowing/fade overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

                {/* List trượt ngang */}
                <div
                  ref={carouselTrendingRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth py-2 pr-24 select-none"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {topTrending.map((movie) => (
                    <div
                      key={`trending-tv-${movie.id}`}
                      className="w-[150px] sm:w-[170px] flex-shrink-0"
                    >
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 2. SECTION NOW PLAYING / ON THE AIR: Carousel Trượt ngang ── */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  On The Air
                </h2>

                {/* Capsules Toggles: Today / This Week */}
                <div className="flex items-center rounded-full border border-border/40 p-0.5 bg-[#14181c]/80 backdrop-blur-sm shadow-inner">
                  <button
                    onClick={() => setNowPlayingWindow("day")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      nowPlayingWindow === "day"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setNowPlayingWindow("week")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      nowPlayingWindow === "week"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    This Week
                  </button>
                </div>
              </div>

              {/* Container Carousel */}
              <div className="relative group/carousel-nowplaying w-full overflow-hidden">
                {/* Left navigation button */}
                <button
                  onClick={() => handleScroll(carouselNowPlayingRef, "left")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-nowplaying:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right navigation button */}
                <button
                  onClick={() => handleScroll(carouselNowPlayingRef, "right")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-nowplaying:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Right edge glowing/fade overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

                {/* List trượt ngang */}
                <div
                  ref={carouselNowPlayingRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth py-2 pr-24 select-none"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {topNowPlaying.map((movie) => (
                    <div
                      key={`nowplaying-tv-${movie.id}`}
                      className="w-[150px] sm:w-[170px] flex-shrink-0"
                    >
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 3. SECTION TOP RATED TV: Carousel Trượt ngang ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-5">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Top Rated TV Series
                  </h2>

                  {/* Capsules Toggles: All Time / 2026 */}
                  <div className="flex items-center rounded-full border border-border/40 p-0.5 bg-[#14181c]/80 backdrop-blur-sm shadow-inner">
                    <button
                      onClick={() => setTopRatedYear("all")}
                      className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                        topRatedYear === "all"
                          ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                          : "text-[#9ab] hover:text-white"
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setTopRatedYear(2026)}
                      className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                        topRatedYear === 2026
                          ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                          : "text-[#9ab] hover:text-white"
                      }`}
                    >
                      2026
                    </button>
                  </div>

                  {loadingTopRated && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              {/* Container Carousel */}
              <div className="relative group/carousel-topimdb w-full overflow-hidden">
                {/* Left navigation button */}
                <button
                  onClick={() => handleScroll(carouselTopRatedRef, "left")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-topimdb:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right navigation button */}
                <button
                  onClick={() => handleScroll(carouselTopRatedRef, "right")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-topimdb:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Right edge glowing/fade overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

                {/* List trượt ngang */}
                <div
                  ref={carouselTopRatedRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth py-2 pr-24 select-none"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {topTopRated.map((movie) => (
                    <div
                      key={`toprated-tv-${movie.id}`}
                      className="w-[150px] sm:w-[170px] flex-shrink-0"
                    >
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 4. SECTION LATEST BY COUNTRY: Carousel Trượt ngang ── */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Latest by Country
                </h2>

                {/* Capsules Toggles: China / Korea / Japan */}
                <div className="flex items-center rounded-full border border-border/40 p-0.5 bg-[#14181c]/80 backdrop-blur-sm shadow-inner">
                  <button
                    onClick={() => setLatestCountry("china")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      latestCountry === "china"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    China
                  </button>
                  <button
                    onClick={() => setLatestCountry("korea")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      latestCountry === "korea"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    Korea
                  </button>
                  <button
                    onClick={() => setLatestCountry("japan")}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none ${
                      latestCountry === "japan"
                        ? "bg-[#0d253f] text-[#01b4e4] font-extrabold shadow"
                        : "text-[#9ab] hover:text-white"
                    }`}
                  >
                    Japan
                  </button>
                </div>

                {loadingLatest && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {/* Container Carousel */}
              <div className="relative group/carousel-latest w-full overflow-hidden">
                {/* Left navigation button */}
                <button
                  onClick={() => handleScroll(carouselLatestRef, "left")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-latest:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right navigation button */}
                <button
                  onClick={() => handleScroll(carouselLatestRef, "right")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 hover:bg-black/90 border border-border/20 text-white shadow-xl opacity-0 group-hover/carousel-latest:opacity-100 transition-all duration-200 focus:outline-none z-20 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Right edge glowing/fade overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

                {/* List trượt ngang */}
                <div
                  ref={carouselLatestRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth py-2 pr-24 select-none"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {latestMovies.map((movie) => (
                    <div
                      key={`latest-tv-${movie.id}`}
                      className="w-[150px] sm:w-[170px] flex-shrink-0"
                    >
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Log Modal */}
      <LogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        onSaved={() => {
          console.log("Logged entry saved successfully!");
        }}
      />

      {/* Footer */}
      <footer className="border-t border-border bg-[#0d1114] py-8 mt-12">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#ff8000]" />
                <span className="h-3 w-3 rounded-full bg-[#00e054]" />
                <span className="h-3 w-3 rounded-full bg-[#40bcf4]" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">CEnt</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Movie data from{" "}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                TMDB
              </a>{" "}
              · Ratings integrated from OMDb API & IMDb Python
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
