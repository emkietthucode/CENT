import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe, User } from "lucide-react";
import {
  fetchMovieDetails,
  getDirector,
  getYear,
  getPosterUrl,
  getBackdropUrl,
  formatCount,
} from "@/lib/tmdb";
import { parseOMDBRatings } from "@/lib/omdb";
import { MovieLogBox } from "@/components/movie-log-box";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Fetch OMDb server-side (direct, no client API route) ────────────────────
async function fetchOmdbServer(
  title: string,
  year: number | null,
  mediaType: "movie" | "tv"
): Promise<any> {
  try {
    const typeParam = mediaType === "tv" ? "series" : "movie";
    const yearParam = year ? `&y=${year}` : "";
    const url = `https://www.omdbapi.com/?apikey=7d5469f2&t=${encodeURIComponent(title)}${yearParam}&type=${typeParam}`;
    const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
    if (!res.ok) return null;
    const data = await res.json();
    return data?.Response === "True" ? data : null;
  } catch {
    return null;
  }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;

  let movie: any;
  try {
    movie = await fetchMovieDetails(id, "movie");
  } catch {
    notFound();
  }

  const director = getDirector(movie);
  const year = getYear(movie.release_date);
  const posterUrl = getPosterUrl(movie.poster_path, "w500");
  const backdropUrl = getBackdropUrl(movie.backdrop_path, "w1280");

  const topCast = movie.credits?.cast?.slice(0, 6) ?? [];

  // Crew
  const directors = movie.credits?.crew?.filter((c: any) => c.job === "Director") ?? [];
  const producers = movie.credits?.crew?.filter((c: any) => c.job === "Producer").slice(0, 4) ?? [];
  const writers = movie.credits?.crew?.filter((c: any) =>
    ["Writer", "Screenplay", "Story"].includes(c.job)
  ).slice(0, 4) ?? [];

  // Details
  const studios = movie.production_companies?.map((c: any) => c.name) ?? [];
  const countries = movie.production_countries?.map((c: any) => c.name) ?? [];
  const altTitlesRaw: any[] =
    movie.alternative_titles?.titles ?? movie.alternative_titles?.results ?? [];
  const altTitles = altTitlesRaw
    .filter((t: any) => t.title && t.title !== movie.title)
    .slice(0, 5);

  const runtimeStr =
    movie.runtime > 0
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : null;

  // ── OMDb Ratings (server-side fetch) ──
  const omdbData = await fetchOmdbServer(movie.title, year, "movie");
  const omdbRatings = parseOMDBRatings(omdbData);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Shared Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-[#14181c]/95 backdrop-blur supports-[backdrop-filter]:bg-[#14181c]/80">
        <div className="mx-auto flex h-15 max-w-[1200px] items-center justify-between px-4">
          <Link href="/" className="flex items-center group flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="CEnt" className="h-30 w-auto group-hover:opacity-90 transition-opacity" />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <div className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[#9ab] select-none">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#456]">
                <User className="h-3.5 w-3.5 text-[#9ab]" />
              </div>
              <span className="font-medium text-white">FILMFAN_01</span>
            </div>
            <nav className="flex items-center gap-4 pl-4">
              <Link href="/" className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors">Films</Link>
              <Link href="/tv-series" className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors">TV Series</Link>
              <Link href="/watchlist" className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors">Watchlist</Link>
              <Link href="/diary" className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors">Diary</Link>
            </nav>
          </div>
          <div className="w-[60px]" />
        </div>
      </header>

      {backdropUrl && (
        <div className="relative mx-auto max-w-[1200px] bg-[#0a0d10]" style={{ height: 520 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdropUrl} alt={movie.title} className="h-full w-full"
            style={{ objectFit: "cover", objectPosition: "center top" }} />
          <div className="pointer-events-none absolute inset-0"
            style={{
              background: `
                linear-gradient(to bottom, #14181c 0%, transparent 18%, transparent 62%, #14181c 100%),
                linear-gradient(to right,  #14181c 0%, transparent 12%, transparent 88%, #14181c 100%)
              `
            }} />
        </div>
      )}

      {/* ── Main content ── */}
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Poster + Info + Log Box row */}
        <div className={`flex gap-8 ${backdropUrl ? "-mt-40 relative z-10" : "mt-8"}`}>

          {/* Poster */}
          <div className="hidden sm:block flex-shrink-0">
            <div className="relative overflow-hidden rounded-md shadow-2xl shadow-black/80 border border-border/60" style={{ width: 200, height: 300 }}>
              <Image src={posterUrl} alt={movie.title} fill className="object-cover" priority sizes="200px" />
            </div>
          </div>

          {/* Info — flex-1, takes remaining space */}
          <div className="flex-1 pt-6 min-w-0">
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">{movie.title}</h1>

            {movie.tagline && (
              <p className="mt-2 text-sm italic text-[#9ab] uppercase tracking-widest">{movie.tagline}</p>
            )}

            {/* Genres + Meta */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {movie.genres?.map((g: any) => (
                <span key={g.id} className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{g.name}</span>
              ))}
              {runtimeStr && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{runtimeStr}</span></>
              )}
              {movie.original_language && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground uppercase"><Globe className="h-3.5 w-3.5" />{movie.original_language}</span></>
              )}
            </div>

            {/* Plot */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start w-full gap-6 mt-4">
  
              {/* ── Plot (Bên trái) ── */}
              {movie.overview ? (
                <div className="flex-1 max-w-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Plot
                  </span>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                    {movie.overview}
                  </p>
                </div>
              ) : (
                /* Khối div rỗng này giúp giữ bố cục nếu phim không có overview */
                <div className="flex-1 max-w-xl"></div> 
              )}

              {/* ── Log Box (Bên phải) ── */}
              <div className="hidden lg:flex flex-col items-end flex-shrink-0 lg:mr-16">
                <MovieLogBox
                  tmdbId={movie.id}
                  mediaType="movie"
                  title={movie.title}
                  year={year}
                  posterPath={movie.poster_path}
                  director={director}
                />
              </div>

            </div>

            {/* ── Ratings row: TMDB + IMDb + RT + Meta ── */}
            <div className="mt-5 flex flex-wrap gap-3">
              {/* TMDB */}
              <div className="flex flex-col items-center justify-between rounded-md bg-[#1c2228] border border-border/50 px-3 py-2.5 min-w-[72px]">
                <span className="text-[9px] font-bold text-[#9ab] uppercase tracking-widest">TMDB</span>
                <div className="my-1 flex items-baseline gap-0.5">
                  <span className="text-[11px] text-[#01b4e4]"></span>
                  <span className="text-base font-black text-white leading-none">{movie.vote_average?.toFixed(1)}</span>
                  <span className="text-[9px] text-muted-foreground"></span>
                </div>
                <span className="text-[9px] text-muted-foreground text-center">{formatCount(movie.vote_count)}</span>
              </div>

              {/* IMDb */}
              {omdbRatings.imdb && (
                <div className="flex flex-col items-center justify-between rounded-md bg-[#1c2228] border border-border/50 px-3 py-2.5 min-w-[72px]">
                  <span className="text-[9px] font-bold text-[#9ab] uppercase tracking-widest">IMDb</span>
                  <div className="my-1 flex items-baseline gap-0.5">
                    <span className="text-[11px] text-[#f5c518]"></span>
                    <span className="text-base font-black text-white leading-none">{omdbRatings.imdb}</span>
                    <span className="text-[9px] text-muted-foreground"></span>
                  </div>
                  {omdbData?.imdbVotes && omdbData.imdbVotes !== "N/A" ? (
                    <span className="text-[9px] text-muted-foreground text-center">{omdbData.imdbVotes.replace(/,/g, ",")}</span>
                  ) : <span className="text-[9px] text-transparent">-</span>}
                </div>
              )}

              {/* Rotten Tomatoes */}
              {omdbRatings.rottenTomatoes && (
                <div className="flex flex-col items-center justify-between rounded-md bg-[#1c2228] border border-border/50 px-3 py-2.5 min-w-[72px]">
                  <span className="text-[9px] font-bold text-[#9ab] uppercase tracking-widest whitespace-nowrap">Rotten Tom.</span>
                  <div className="my-1 flex items-center gap-1">
                    <span className="text-sm leading-none">{parseInt(omdbRatings.rottenTomatoes) >= 60 ? "🍅" : "🤢"}</span>
                    <span className="text-base font-black text-white leading-none">{omdbRatings.rottenTomatoes}</span>
                  </div>
                  <span className="text-[9px] text-transparent">-</span>
                </div>
              )}

              {/* Metacritic */}
              {omdbRatings.metacritic && (
                <div className="flex flex-col items-center justify-between rounded-md bg-[#1c2228] border border-border/50 px-3 py-2.5 min-w-[72px]">
                  <span className="text-[9px] font-bold text-[#9ab] uppercase tracking-widest">Metacritic</span>
                  <span
                    className={`my-1 flex h-8 w-10 items-center justify-center rounded font-black text-sm text-white ${
                      parseInt(omdbRatings.metacritic) >= 61
                        ? "bg-[#54a72a]"
                        : parseInt(omdbRatings.metacritic) >= 40
                        ? "bg-[#ffbd3f] text-black"
                        : "bg-[#ff2a2a]"
                    }`}
                  >
                    {omdbRatings.metacritic}
                  </span>
                  <span className="text-[9px] text-transparent">-</span>
                </div>
              )}
            </div>
          </div>
        </div>

        

        {/* ── 3-Column: Cast | Crew | Details ── */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* CAST */}
          <div>
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-2 mb-4">Cast</h2>
            <div className="space-y-2">
              {topCast.map((actor: any) => (
                <div key={actor.id} className="flex items-center gap-3">
                  <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
                    {actor.profile_path ? (
                      <Image src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} fill className="object-cover" sizes="36px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground">{actor.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{actor.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CREW */}
          <div>
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-2 mb-4">Crew</h2>
            <div className="space-y-4">
              {directors.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Director</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {directors.map((c: any) => (
                      <span key={c.id} className="text-xs font-semibold text-white bg-[#1c2228] px-2 py-1 rounded">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Writer</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {writers.map((c: any) => (
                      <span key={`${c.id}-${c.job}`} className="text-xs text-foreground/90 bg-[#1c2228] px-2 py-1 rounded">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {producers.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Producers</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {producers.map((c: any) => (
                      <span key={c.id} className="text-xs text-foreground/90 bg-[#1c2228] px-2 py-1 rounded">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DETAILS */}
          <div>
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-2 mb-4">Details</h2>
            <div className="space-y-2.5 text-xs">
              {year && (
                <div className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">Year</span>
                  <span className="text-foreground/90 font-medium">{year}</span>
                </div>
              )}
              {studios.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">Studios</span>
                  <span className="text-foreground/90 font-medium leading-snug">{studios.join(", ")}</span>
                </div>
              )}
              {countries.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">Country</span>
                  <span className="text-foreground/90 font-medium">{countries.join(", ")}</span>
                </div>
              )}
              {altTitles.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">Alt Titles</span>
                  <div className="flex flex-col gap-0.5">
                    {altTitles.map((t: any, i: number) => (
                      <span key={i} className="text-foreground/80 text-[11px]">
                        {t.title}
                        {t.iso_3166_1 && <span className="ml-1 text-muted-foreground/60 text-[10px]">({t.iso_3166_1})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pb-16" />
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-[#0d1114] py-8 mt-8">
        <div className="mx-auto max-w-[1200px] px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="CEnt" className="h-10 w-auto opacity-70 group-hover:opacity-100 transition-opacity" />
          </Link>
          <p className="text-xs text-muted-foreground">
            Data from <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TMDB</a>
            {" "}& <a href="https://www.imdb.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">IMDb</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
