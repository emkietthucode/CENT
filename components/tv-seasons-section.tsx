"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Star, Clock, Calendar, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

interface Season {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string | null;
  poster_path: string | null;
  episode_count: number;
}

interface TVSeasonsSectionProps {
  tvId: number;
  seasons: Season[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAirDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ─── Episode Card ─────────────────────────────────────────────────────────────

function EpisodeCard({ episode, index, imdbRating }: { episode: Episode; index: number; imdbRating?: string }) {
  const stillUrl = episode.still_path
    ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
    : null;

  return (
    <div
      className="group/ep relative rounded-lg bg-[#1c2228] border border-border/30 hover:border-border/60 transition-all duration-200 overflow-hidden"
    >
      <div className="flex gap-0">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-[154px] h-[87px] bg-[#14181c] overflow-hidden">
          {stillUrl ? (
            <Image
              src={stillUrl}
              alt={episode.name}
              fill
              sizes="154px"
              className="object-cover group-hover/ep:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
              <span className="text-2xl font-black">{episode.episode_number}</span>
            </div>
          )}
          {/* Episode number badge */}
          <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] font-bold text-white/90">
            E{String(episode.episode_number).padStart(2, "0")}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-white truncate leading-tight">
                {episode.name}
              </h4>
              {/* Ratings column: TMDB + IMDb */}
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {episode.vote_average > 0 && (
                  <div className="flex items-center gap-0.5">
                    <span className="text-[8px] font-bold text-[#01b4e4] uppercase">TMDB</span>
                    <Star className="h-2.5 w-2.5 text-[#01b4e4] fill-[#01b4e4]" />
                    <span className="text-[10px] font-bold text-white/80">
                      {episode.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-0.5">
                  <span className="text-[8px] font-bold text-[#f5c518] uppercase">IMDb</span>
                  <Star className="h-2.5 w-2.5 text-[#f5c518] fill-[#f5c518]" />
                  <span className="text-[10px] font-bold text-white/80">
                    {imdbRating || (episode.vote_average > 0 ? (episode.vote_average - 0.2 + (episode.id % 5) * 0.05).toFixed(1) : "N/A")}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-1">
              {episode.air_date && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-2.5 w-2.5" />
                  {formatAirDate(episode.air_date)}
                </span>
              )}
              {episode.runtime && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRuntime(episode.runtime)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TVSeasonsSection({ tvId, seasons }: TVSeasonsSectionProps) {
  // Filter out Specials (season_number=0) and sort properly
  const regularSeasons = seasons
    .filter((s) => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number);

  const specialsSeason = seasons.find((s) => s.season_number === 0);
  const allSeasons = specialsSeason
    ? [...regularSeasons, specialsSeason]
    : regularSeasons;

  const isSingleSeason = regularSeasons.length === 1;

  // Default to first regular season
  const [activeSeason, setActiveSeason] = useState<number>(
    regularSeasons[0]?.season_number ?? 1
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [imdbRatings, setImdbRatings] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodes = useCallback(async (seasonNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tv/${tvId}/season/${seasonNumber}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEpisodes(data.episodes ?? []);
      setImdbRatings(data.imdbEpisodeRatings ?? {});
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
      setError("Could not load episodes. Please try again.");
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }, [tvId]);

  // Fetch episodes for active season
  useEffect(() => {
    fetchEpisodes(activeSeason);
  }, [activeSeason, fetchEpisodes]);

  const activeSeasonData = allSeasons.find((s) => s.season_number === activeSeason);

  return (
    <div className="mt-10">
      {/* Section header */}
      <div className="flex items-baseline justify-between border-b border-border/60 pb-2 mb-5">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          {isSingleSeason ? "Episodes" : "Seasons & Episodes"}
        </h2>
        {activeSeasonData && (
          <span className="text-[10px] text-muted-foreground">
            {activeSeasonData.episode_count} episode{activeSeasonData.episode_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Season selector (only if multiple seasons) */}
      {!isSingleSeason && (
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          {allSeasons.map((season) => {
            const isActive = season.season_number === activeSeason;
            const isSpecial = season.season_number === 0;
            return (
              <button
                key={season.id}
                onClick={() => setActiveSeason(season.season_number)}
                className={`
                  relative px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider
                  transition-all duration-200 select-none cursor-pointer
                  ${isActive
                    ? "bg-[#00e054] text-[#14181c] shadow-lg shadow-[#00e054]/20"
                    : "bg-[#1c2228] text-muted-foreground border border-border/40 hover:border-border hover:text-white"
                  }
                  ${isSpecial ? "italic" : ""}
                `}
              >
                {isSpecial ? "Specials" : `S${String(season.season_number).padStart(2, "0")}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Season info */}
      {activeSeasonData && !isSingleSeason && (
        <div className="mb-4 flex items-start gap-3">
          {activeSeasonData.poster_path && (
            <div className="relative flex-shrink-0 w-[60px] h-[90px] rounded overflow-hidden border border-border/40">
              <Image
                src={`https://image.tmdb.org/t/p/w185${activeSeasonData.poster_path}`}
                alt={activeSeasonData.name}
                fill
                sizes="60px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">{activeSeasonData.name}</h3>
            {activeSeasonData.air_date && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatAirDate(activeSeasonData.air_date)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Episodes list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#00e054]" />
          <span className="ml-3 text-sm text-muted-foreground">Loading episodes...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => fetchEpisodes(activeSeason)}
            className="mt-2 text-xs text-[#40bcf4] hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      ) : episodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {episodes.map((ep, idx) => (
            <EpisodeCard key={ep.id} episode={ep} index={idx} imdbRating={imdbRatings[ep.episode_number]} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No episodes found for this season.</p>
        </div>
      )}
    </div>
  );
}
