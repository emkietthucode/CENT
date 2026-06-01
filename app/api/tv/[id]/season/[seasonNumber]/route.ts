import { NextRequest, NextResponse } from "next/server";
import { fetchTVSeasonDetails } from "@/lib/tmdb";

const OMDB_API_KEY = process.env.OMDB_API_KEY || "7d5469f2";

async function fetchOmdbSeasonRatings(
  showTitle: string,
  seasonNumber: number
): Promise<Record<number, string>> {
  // OMDB supports ?t=ShowName&Season=X which returns all episode ratings at once
  const ratings: Record<number, string> = {};
  try {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(showTitle)}&Season=${seasonNumber}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return ratings;
    const data = await res.json();
    if (data?.Response === "True" && data.Episodes && Array.isArray(data.Episodes)) {
      for (const ep of data.Episodes) {
        const epNum = parseInt(ep.Episode, 10);
        if (!isNaN(epNum) && ep.imdbRating && ep.imdbRating !== "N/A") {
          ratings[epNum] = ep.imdbRating;
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch OMDB season ratings for "${showTitle}" S${seasonNumber}:`, err);
  }
  return ratings;
}

async function fetchShowTitle(tvId: string): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY!;
    const url = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}&language=en-US`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      return data.name || data.original_name || "";
    }
  } catch {}
  return "";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seasonNumber: string }> }
) {
  const { id, seasonNumber } = await params;
  const seasonNum = parseInt(seasonNumber, 10);

  if (isNaN(seasonNum)) {
    return NextResponse.json({ error: "Invalid season number" }, { status: 400 });
  }

  try {
    // Fetch TMDB season details and show title in parallel
    const [data, showTitle] = await Promise.all([
      fetchTVSeasonDetails(id, seasonNum),
      fetchShowTitle(id),
    ]);

    // Fetch OMDB episode ratings (single API call for entire season)
    let imdbEpisodeRatings: Record<number, string> = {};
    if (showTitle) {
      imdbEpisodeRatings = await fetchOmdbSeasonRatings(showTitle, seasonNum);
    }

    return NextResponse.json({ ...data, imdbEpisodeRatings });
  } catch (err: any) {
    console.error(`Failed to fetch season ${seasonNum} for TV ${id}:`, err);
    return NextResponse.json(
      { error: "Failed to fetch season details" },
      { status: 500 }
    );
  }
}
