"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Tv, Film, Trash2, Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { LogModal } from "@/components/log-modal";
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from "@/lib/supabase";
import { Footer } from "@/components/footer";
import { getPosterUrl, getYear } from "@/lib/tmdb";
import { getOmdbData, parseOMDBRatings } from "@/lib/omdb";

function WatchlistMovieCard({ item, onRemoved }: { item: WatchlistItem; onRemoved: () => void }) {
  const posterUrl = getPosterUrl(item.poster_path ?? null, "w342");
  // Normalize release_date so getYear works correctly
  const releaseDate = item.year ? `${item.year}-01-01` : "";
  const year = getYear(releaseDate);
  const isTV = item.media_type === "tv";
  const href = isTV ? `/tv/${item.tmdb_id}` : `/movie/${item.tmdb_id}`;

  const [omdbRatings, setOmdbRatings] = useState<{ imdb?: string; rottenTomatoes?: string; metacritic?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadOmdb = async () => {
      const data = await getOmdbData(item.tmdb_id, item.title, item.year ?? null, item.media_type, "");
      if (active && data) {
        setOmdbRatings(parseOMDBRatings(data));
      }
    };
    loadOmdb();
    return () => {
      active = false;
    };
  }, [item]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    
    setDeleting(true);
    const success = await removeFromWatchlist(item.tmdb_id, item.media_type);
    if (success) {
      onRemoved();
    } else {
      setDeleting(false);
    }
  };

  return (
    <div className="group/movie-card relative flex flex-col">
      <Link href={href} className="flex-1">
        <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-transparent bg-card transition-all duration-200 group-hover/movie-card:border-[#40bcf4] group-hover/movie-card:shadow-lg group-hover/movie-card:shadow-[#40bcf4]/10">
          <Image
            src={posterUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover/movie-card:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            priority={false}
          />

          {/* Badges */}
          {isTV ? (
            <div className="absolute left-2 top-2 flex items-center gap-0.5 rounded bg-[#40bcf4]/85 px-1.5 py-0.5 backdrop-blur-sm select-none">
              <Tv className="h-2.5 w-2.5 text-white" />
              <span className="text-[10px] font-bold text-white">TV</span>
            </div>
          ) : (
            <div className="absolute left-2 top-2 flex items-center gap-0.5 rounded bg-[#00e054]/85 px-1.5 py-0.5 backdrop-blur-sm select-none">
              <Film className="h-2.5 w-2.5 text-white" />
              <span className="text-[10px] font-bold text-white">Movie</span>
            </div>
          )}

          {/* Delete Button (absolute corner) */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-muted-foreground hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm shadow-md cursor-pointer opacity-0 group-hover/movie-card:opacity-100 focus:opacity-100"
            title="Remove from watchlist"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/movie-card:opacity-100 transition-opacity duration-200">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{item.title}</h3>
              {year && <p className="text-xs text-muted-foreground mt-0.5">{year}</p>}
            </div>
          </div>
        </div>

        {/* Ratings row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#9ab] select-none px-0.5">
          {/* IMDb Rating */}
          {omdbRatings?.imdb ? (
            <span className="flex items-center gap-0.5 text-white font-semibold" title="IMDb Rating">
              <span className="bg-[#f5c518] text-black font-extrabold px-1 py-0.2 rounded-[2px] text-[8px] leading-none tracking-tighter">IMDb</span>
              {omdbRatings.imdb}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">No ratings yet</span>
          )}

          {/* Rotten Tomatoes */}
          {omdbRatings?.rottenTomatoes && (
            (() => {
              const score = parseInt(omdbRatings.rottenTomatoes.replace("%", ""));
              const isFresh = score >= 60;
              return (
                <span className="flex items-center gap-0.5 text-white font-semibold" title={`Rotten Tomatoes ${isFresh ? "Fresh" : "Rotten"}`}>
                  <span className="text-[11px] leading-none">{isFresh ? "🍅" : "🤢"}</span>
                  {omdbRatings.rottenTomatoes}
                </span>
              );
            })()
          )}
        </div>
      </Link>
    </div>
  );
}

export default function WatchlistPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getWatchlist();
      setWatchlistItems(items);
    } catch (err) {
      console.error("Failed to load watchlist:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          window.location.href = `/?search=${encodeURIComponent(q)}`;
        }}
        onLogClick={() => setLogModalOpen(true)}
      />

      <main className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Title bar */}
        <div className="mb-6 flex items-baseline justify-between border-b border-border pb-4">
          <h1 className="text-xl font-black text-white tracking-widest uppercase">WATCHLIST</h1>
          <span className="text-xs text-muted-foreground font-semibold">
            {watchlistItems.length} {watchlistItems.length === 1 ? "ITEM" : "ITEMS"} TO WATCH
          </span>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#40bcf4]" />
            <span className="ml-3 text-sm text-[#9ab]">Loading watchlist...</span>
          </div>
        ) : watchlistItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {watchlistItems.map((item) => (
              <WatchlistMovieCard
                key={`${item.media_type}-${item.tmdb_id}`}
                item={item}
                onRemoved={loadWatchlist}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center bg-card/10">
            <p className="text-[#9ab] mb-4">Your watchlist is empty. Find movies or TV shows to watch later!</p>
            <Link
              href="/"
              className="rounded bg-[#00c030] px-6 py-2.5 font-semibold text-white hover:bg-[#00e054] active:scale-95 transition-all"
            >
              Discover Films
            </Link>
          </div>
        )}
      </main>

      <LogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        onSaved={loadWatchlist}
      />
      <Footer />
    </div>
  );
}
