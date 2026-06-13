import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe, Tv, Users, User } from "lucide-react";
import {
  fetchMovieDetails,
  getDirector,
  getYear,
  getPosterUrl,
  getBackdropUrl,
  formatCount,
  fetchTVEpisodeGroups,
} from "@/lib/tmdb";
import { parseOMDBRatings } from "@/lib/omdb";
import { MovieLogBox } from "@/components/movie-log-box";
import { TVSeasonsSection } from "@/components/tv-seasons-section";
import { getMediaCustomization } from "@/lib/supabase";
import { CustomizablePoster } from "@/components/customizable-poster";
import { DetailHeader } from "@/components/detail-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchOmdbServer(title: string, year: number | null, mediaType: "movie" | "tv"): Promise<any> {
  try {
    const typeParam = mediaType === "tv" ? "series" : "movie";
    const yearParam = year ? `&y=${year}` : "";
    const omdbKey = process.env.OMDB_API_KEY || "7d5469f2";
    const url = `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}${yearParam}&type=${typeParam}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.Response === "True" ? data : null;
  } catch {
    return null;
  }
}

export default async function TVDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tvIdNum = parseInt(id, 10);

  let show: any;
  try {
    show = await fetchMovieDetails(id, "tv");
  } catch {
    notFound();
  }

  // Load customizations & episode groups
  const [customization, episodeGroupsData] = await Promise.all([
    getMediaCustomization(tvIdNum, "tv"),
    fetchTVEpisodeGroups(tvIdNum).catch(() => ({ results: [] })),
  ]);

  const customPosterPath = customization?.custom_poster_path;
  const customBackdropPath = customization?.custom_backdrop_path;
  const selectedGroupId = customization?.season_group_id || null;
  const customSeasonNames = customization?.custom_season_names || {};

  const year = getYear(show.release_date);
  const posterUrl = getPosterUrl(customPosterPath || show.poster_path, "w500");
  const backdropUrl = getBackdropUrl(customBackdropPath || show.backdrop_path, "w1280");
  const episodeGroups = episodeGroupsData?.results || [];
  const topCast = show.credits?.cast?.slice(0, 6) ?? [];

  // Crew
  const createdBy: any[] = show.created_by ?? [];
  const directors = show.credits?.crew?.filter((c: any) =>
    ["Director", "Series Director"].includes(c.job)
  ) ?? [];
  const writers = show.credits?.crew?.filter((c: any) =>
    ["Writer", "Screenplay", "Story"].includes(c.job)
  ).slice(0, 4) ?? [];
  const producers = show.credits?.crew?.filter((c: any) =>
    ["Producer", "Executive Producer"].includes(c.job)
  ).slice(0, 4) ?? [];

  const allDirectors = [
    ...createdBy.map((c: any) => ({ id: `cb-${c.id}`, name: c.name })),
    ...directors.map((c: any) => ({ id: c.id, name: c.name })),
  ].filter((d, idx, arr) => arr.findIndex(x => x.name === d.name) === idx);

  // Details
  const studios = show.production_companies?.map((c: any) => c.name) ?? [];
  const networks = show.networks?.map((n: any) => n.name) ?? [];
  const countries = show.production_countries?.map((c: any) => c.name) ?? [];
  const altTitlesRaw: any[] =
    show.alternative_titles?.titles ?? show.alternative_titles?.results ?? [];
  const altTitles = altTitlesRaw
    .filter((t: any) => t.title && t.title !== show.title)
    .slice(0, 5);

  const runtimeStr = show.runtime > 0 ? `~${show.runtime} min/ep` : null;

  // ── OMDb Ratings ──
  const omdbData = await fetchOmdbServer(show.title, year, "tv");
  const omdbRatings = parseOMDBRatings(omdbData);

  // director label for log box
  const directorLabel = allDirectors.map((d: any) => d.name).join(", ") || "Unknown";

  // Seasons data - Check if using custom episode group
  let rawSeasons: any[] = show.seasons ?? [];
  let customGroupDetails = null;

  if (selectedGroupId) {
    const { fetchTVEpisodeGroupDetails } = await import("@/lib/tmdb");
    try {
      customGroupDetails = await fetchTVEpisodeGroupDetails(selectedGroupId);
      if (customGroupDetails && customGroupDetails.groups) {
        rawSeasons = customGroupDetails.groups.map((g: any) => ({
          id: g.id ? parseInt(String(g.id).replace(/\D/g, '')) || Math.floor(Math.random() * 100000) : Math.floor(Math.random() * 100000),
          name: g.name,
          overview: g.overview || "",
          season_number: g.order || 1,
          air_date: g.episodes?.[0]?.air_date || null,
          poster_path: g.poster_path || null,
          episode_count: g.episodes?.length || 0,
        }));
      }
    } catch (err) {
      console.error("Error loading custom episode group details:", err);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader />

      {/* ── Hero Backdrop ── */}
      {backdropUrl && (
        <div className="relative mx-auto max-w-[1200px] bg-[#0a0d10]" style={{ height: 520 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdropUrl} alt={show.title} className="h-full w-full"
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
        <div className={`flex gap-8 ${backdropUrl ? "-mt-40 relative z-10" : "mt-8"}`}>

          {/* Poster */}
          <div className="hidden sm:block flex-shrink-0">
            <CustomizablePoster
              tmdbId={show.id}
              mediaType="tv"
              title={show.title}
              defaultPosterPath={show.poster_path}
              defaultBackdropPath={show.backdrop_path}
              currentPosterPath={customPosterPath || null}
              currentBackdropPath={customBackdropPath || null}
              posterUrl={posterUrl}
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-6 min-w-0">
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">{show.title}</h1>

            {show.tagline && (
              <p className="mt-2 text-sm italic text-[#9ab] uppercase tracking-widest">{show.tagline}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {show.genres?.map((g: any) => (
                <span key={g.id} className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{g.name}</span>
              ))}
              {show.number_of_seasons && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Tv className="h-3.5 w-3.5" />{show.number_of_seasons} season{show.number_of_seasons > 1 ? "s" : ""}</span></>
              )}
              {show.number_of_episodes && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{show.number_of_episodes} episodes</span></>
              )}
              {runtimeStr && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{runtimeStr}</span></>
              )}
              {show.original_language && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground uppercase"><Globe className="h-3.5 w-3.5" />{show.original_language}</span></>
              )}
            </div>

            {show.overview && (
              <div className="mt-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Plot</span>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/90 max-w-xl">{show.overview}</p>
              </div>
            )}

            {/* ── Ratings row ── */}
            <div className="mt-5 flex flex-wrap gap-3">
              {/* TMDB */}
              <div className="flex flex-col items-center justify-between rounded-md bg-[#1c2228] border border-border/50 px-3 py-2.5 min-w-[72px]">
                <span className="text-[9px] font-bold text-[#9ab] uppercase tracking-widest">TMDB</span>
                <div className="my-1 flex items-baseline gap-0.5">
                  <span className="text-[11px] text-[#01b4e4]">★</span>
                  <span className="text-base font-black text-white leading-none">{show.vote_average?.toFixed(1)}</span>
                  <span className="text-[9px] text-muted-foreground">/10</span>
                </div>
                <span className="text-[9px] text-muted-foreground text-center">{formatCount(show.vote_count)}</span>
              </div>

              {/* IMDb */}
              {omdbRatings.imdb && (
                <div className="flex flex-col items-center justify-between rounded-md bg-[#1c2228] border border-border/50 px-3 py-2.5 min-w-[72px]">
                  <span className="text-[9px] font-bold text-[#9ab] uppercase tracking-widest">IMDb</span>
                  <div className="my-1 flex items-baseline gap-0.5">
                    <span className="text-[11px] text-[#f5c518]">★</span>
                    <span className="text-base font-black text-white leading-none">{omdbRatings.imdb}</span>
                    <span className="text-[9px] text-muted-foreground">/10</span>
                  </div>
                  {omdbData?.imdbVotes && omdbData.imdbVotes !== "N/A" ? (
                    <span className="text-[9px] text-muted-foreground text-center">{omdbData.imdbVotes}</span>
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

          {/* ── Log Box ── */}
          <div className="hidden lg:flex flex-col items-end pt-6 flex-shrink-0">
            <MovieLogBox
              tmdbId={show.id}
              mediaType="tv"
              title={show.title}
              year={year}
              posterPath={customPosterPath || show.poster_path}
              director={directorLabel}
              numberOfSeasons={rawSeasons.length}
              seasons={rawSeasons}
              customSeasonNames={customSeasonNames}
            />
          </div>
        </div>

        {/* Log Box mobile */}
        <div className="mt-6 lg:hidden">
          <MovieLogBox
            tmdbId={show.id}
            mediaType="tv"
            title={show.title}
            year={year}
            posterPath={customPosterPath || show.poster_path}
            director={directorLabel}
            numberOfSeasons={rawSeasons.length}
            seasons={rawSeasons}
            customSeasonNames={customSeasonNames}
          />
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
              {allDirectors.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Director</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {allDirectors.map((c: any) => (
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
              {networks.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">Network</span>
                  <span className="text-foreground/90 font-medium leading-snug">{networks.join(", ")}</span>
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

        {/* ── Seasons & Episodes ── */}
        {rawSeasons.length > 0 && (
          <TVSeasonsSection
            tvId={show.id}
            seasons={rawSeasons}
            episodeGroups={episodeGroups}
            selectedGroupId={selectedGroupId}
            customSeasonNames={customSeasonNames}
          />
        )}

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
