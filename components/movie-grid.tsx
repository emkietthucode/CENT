"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Tv, Film } from "lucide-react";
import { getPosterUrl, getYear, formatCount } from "@/lib/tmdb";
import { getOmdbData, parseOMDBRatings } from "@/lib/omdb";
import type { TMDBMovie } from "@/types";

interface MovieGridProps {
  movies: TMDBMovie[];
  title?: string;
  loading?: boolean;
}

export function MovieGrid({ movies, title, loading = false }: MovieGridProps) {
  if (loading) {
    return (
      <section className="w-full">
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-sm bg-secondary" />
              <div className="mt-1.5 space-y-1">
                <div className="h-2.5 w-3/4 rounded bg-secondary" />
                <div className="h-2 w-1/2 rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          <span className="text-xs uppercase tracking-wider text-muted-foreground hover:text-white cursor-pointer transition-colors">
            More
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={`${movie.media_type ?? "movie"}-${movie.id}`} movie={movie} />
        ))}
      </div>
    </section>
  );
}

export function MovieCard({ movie }: { movie: TMDBMovie }) {
  const posterUrl = getPosterUrl(movie.poster_path, "w342");
  const year = getYear(movie.release_date);
  const isTV = movie.media_type === "tv";
  const href = isTV ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  // Điểm TMDB thô 0-10 và số lượng vote
  const tmdbRating = movie.vote_average ? movie.vote_average.toFixed(1) : "0.0";
  const tmdbVotes = formatCount(movie.vote_count);

  // OMDB Ratings State
  const [omdbRatings, setOmdbRatings] = useState<{ imdb?: string; rottenTomatoes?: string; metacritic?: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadOmdb = async () => {
      const y = getYear(movie.release_date);
      const data = await getOmdbData(movie.id, movie.title, y, movie.media_type ?? "movie", tmdbRating);
      if (active && data) {
        setOmdbRatings(parseOMDBRatings(data));
      }
    };
    loadOmdb();
    return () => {
      active = false;
    };
  }, [movie]);

  return (
    <Link href={href} className="group/movie-card">
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-transparent bg-card transition-all duration-200 group-hover/movie-card:border-[#00e054] group-hover/movie-card:shadow-lg group-hover/movie-card:shadow-[#00e054]/10">
        <Image
          src={posterUrl}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-300 group-hover/movie-card:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
        />

        {/* Badges góc trên trái */}
        {isTV ? (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-[#40bcf4]/80 px-1 py-0.5 backdrop-blur-sm select-none">
            <Tv className="h-2.5 w-2.5 text-white" />
            <span className="text-[10px] font-medium text-white">TV</span>
          </div>
        ) : (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-[#00e054]/80 px-1 py-0.5 backdrop-blur-sm select-none">
            <Film className="h-2.5 w-2.5 text-white" />
            <span className="text-[10px] font-medium text-white">Movie</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/movie-card:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <h3 className="text-sm font-medium text-white leading-tight line-clamp-2">{movie.title}</h3>
            {/* Tên gốc nếu khác tên tiếng Anh */}
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-xs text-[#9ab] line-clamp-1">{movie.original_title}</p>
            )}
            {year && <p className="text-xs text-muted-foreground">{year}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground select-none">
        {/* TMDB Rating */}
        <span className="flex items-center gap-0.5 text-white font-medium" title="TMDB Rating">
          <Star className="h-3.5 w-3.5 fill-[#ff8000] text-[#ff8000]" />
          {tmdbRating}
        </span>

        {/* IMDb Rating */}
        {omdbRatings?.imdb && (
          <span className="flex items-center gap-0.5 text-white font-medium" title="IMDb Rating">
            <span className="bg-[#f5c518] text-black font-extrabold px-0.5 py-px rounded-[2px] text-[8px] leading-none tracking-tighter">IMDb</span>
            {omdbRatings.imdb}
          </span>
        )}

        {/* Rotten Tomatoes */}
        {omdbRatings?.rottenTomatoes && (
          (() => {
            const score = parseInt(omdbRatings.rottenTomatoes.replace("%", ""));
            const isFresh = score >= 60;
            return (
              <span className="flex items-center gap-0.5 text-white font-medium" title={`Rotten Tomatoes ${isFresh ? "Fresh" : "Rotten"}`}>
                <span className="text-[11px] leading-none">{isFresh ? "🍅" : "🤢"}</span>
                {omdbRatings.rottenTomatoes}
              </span>
            );
          })()
        )}

        {/* Metacritic */}
        {omdbRatings?.metacritic && (
          (() => {
            const score = parseInt(omdbRatings.metacritic);
            let bgClass = "bg-[#ff3333]"; // Đỏ
            if (score >= 61) bgClass = "bg-[#66cc33]"; // Xanh lá
            else if (score >= 40) bgClass = "bg-[#ffcc33]"; // Vàng
            return (
              <span className="flex items-center gap-0.5 text-white font-medium" title="Metascore">
                <span className={`${bgClass} text-black font-extrabold px-0.5 py-px rounded-[2px] text-[8px] leading-none`}>M</span>
                {score}
              </span>
            );
          })()
        )}
      </div>
    </Link>
  );
}
