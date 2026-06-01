"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, Grid3X3 } from "lucide-react";
import type { Movie } from "@/lib/movies";

interface MovieGridProps {
  movies: Movie[];
  title?: string;
}

export function MovieGrid({ movies, title }: MovieGridProps) {
  return (
    <section className="w-full">
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          <span className="text-xs uppercase tracking-wider text-muted-foreground hover:text-white cursor-pointer transition-colors">
            More
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`} className="group">
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-transparent bg-card transition-all duration-200 group-hover:border-[#00e054] group-hover:shadow-lg group-hover:shadow-[#00e054]/10">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
        />
        {/* Hover overlay with title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <h3 className="text-sm font-medium text-white leading-tight line-clamp-2">
              {movie.title}
            </h3>
            <p className="text-xs text-muted-foreground">{movie.year}</p>
          </div>
        </div>
      </div>
      {/* Stats below poster */}
      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-[#00e054]" />
          {movie.views}
        </span>
        <span className="flex items-center gap-1">
          <Grid3X3 className="h-3 w-3 text-[#40bcf4]" />
          {Math.floor(parseInt(movie.likes.replace(/[KM]/g, "")) * 0.3)}K
        </span>
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3 text-[#ff8000]" />
          {movie.likes}
        </span>
      </div>
    </Link>
  );
}
