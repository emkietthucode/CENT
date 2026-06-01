import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, Star, Eye, Heart, Calendar, Film, Users } from "lucide-react";
import { getMovieById, movies } from "@/lib/movies";

interface MovieDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = await params;
  const movie = getMovieById(id);

  if (!movie) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-[#14181c]/95 backdrop-blur supports-[backdrop-filter]:bg-[#14181c]/80">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-[#ff8000]" />
              <span className="h-4 w-4 rounded-full bg-[#00e054]" />
              <span className="h-4 w-4 rounded-full bg-[#40bcf4]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Filmboxd
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-wider text-white hover:text-[#40bcf4] transition-colors"
            >
              Films
            </Link>
          </nav>
        </div>
      </header>

      {/* Back button */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to films
        </Link>
      </div>

      {/* Movie Detail Content */}
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
          {/* Left Column - Poster */}
          <div className="space-y-4">
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-border shadow-2xl">
              <Image
                src={movie.posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
                priority
                sizes="350px"
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4">
              <button className="flex flex-col items-center gap-1 rounded-sm bg-[#2c3440] px-6 py-3 text-muted-foreground hover:bg-[#384250] hover:text-white transition-colors">
                <Eye className="h-5 w-5 text-[#00e054]" />
                <span className="text-xs">Watch</span>
              </button>
              <button className="flex flex-col items-center gap-1 rounded-sm bg-[#2c3440] px-6 py-3 text-muted-foreground hover:bg-[#384250] hover:text-white transition-colors">
                <Heart className="h-5 w-5 text-[#ff8000]" />
                <span className="text-xs">Like</span>
              </button>
              <button className="flex flex-col items-center gap-1 rounded-sm bg-[#2c3440] px-6 py-3 text-muted-foreground hover:bg-[#384250] hover:text-white transition-colors">
                <Clock className="h-5 w-5 text-[#40bcf4]" />
                <span className="text-xs">Watchlist</span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 rounded-sm bg-[#1c2228] p-4">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-[#00e054]" />
                <span className="text-white">{movie.views}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-[#ff8000]" />
                <span className="text-white">{movie.likes}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-[#00e054] text-[#00e054]" />
                <span className="text-white">{movie.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-8">
            {/* Title Section */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white lg:text-4xl">
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {movie.year}
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {movie.genre.map((g) => (
                  <span
                    key={g}
                    className="rounded-sm bg-[#2c3440] px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Synopsis
              </h2>
              <p className="text-base leading-relaxed text-foreground">
                {movie.synopsis}
              </p>
            </div>

            {/* Director */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Director
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2c3440] text-white">
                  {movie.director.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-white">{movie.director}</p>
                  <p className="text-sm text-muted-foreground">Director</p>
                </div>
              </div>
            </div>

            {/* Producers */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Producers
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {movie.producers.map((producer) => (
                  <div key={producer} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2c3440] text-sm text-white">
                      {producer.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{producer}</p>
                      <p className="text-xs text-muted-foreground">Producer</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cast */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Cast
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {movie.cast.map((actor) => (
                  <div key={actor} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2c3440] text-sm text-white">
                      {actor.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-foreground">{actor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Films */}
        <section className="mt-16 border-t border-border pt-8">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            You might also like
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {movies
              .filter((m) => m.id !== movie.id)
              .slice(0, 6)
              .map((relatedMovie) => (
                <Link
                  key={relatedMovie.id}
                  href={`/movie/${relatedMovie.id}`}
                  className="group"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-transparent transition-all duration-200 group-hover:border-[#00e054]">
                    <Image
                      src={relatedMovie.posterUrl}
                      alt={relatedMovie.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                    />
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </main>

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
