import { NextRequest, NextResponse } from "next/server";
import { fetchTVSeasonDetails } from "@/lib/tmdb";
import { supabase, STATIC_USER_ID } from "@/lib/supabase";

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
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "bc0891412903fa87995b94459b3cf9e6";
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
    const tvIdNum = parseInt(id, 10);

    // 1. Kiểm tra xem TV series này có cấu hình season group tùy chỉnh không
    const { data: customData } = await supabase
      .from("media_customizations")
      .select("season_group_id")
      .eq("user_id", STATIC_USER_ID)
      .eq("tmdb_id", tvIdNum)
      .eq("media_type", "tv")
      .maybeSingle();

    const seasonGroupId = customData?.season_group_id;

    if (seasonGroupId) {
      const { fetchTVEpisodeGroupDetails } = await import("@/lib/tmdb");
      const groupDetails = await fetchTVEpisodeGroupDetails(seasonGroupId);
      const groups = groupDetails.groups || [];
      
      // Tìm nhóm season có order khớp với seasonNum hoặc theo thứ tự index
      const targetGroup = groups.find((g: any) => g.order === seasonNum) || groups[seasonNum - 1];

      if (!targetGroup) {
        return NextResponse.json({ error: "Season not found in episode group" }, { status: 404 });
      }

      // Map sang cấu trúc TMDBSeasonDetail để component frontend hiển thị bình thường
      const mockSeasonDetail = {
        id: targetGroup.id ? parseInt(String(targetGroup.id).replace(/\D/g, '')) || 0 : 0,
        name: targetGroup.name,
        overview: targetGroup.overview || "",
        season_number: seasonNum,
        air_date: targetGroup.air_date || (targetGroup.episodes?.[0]?.air_date || null),
        poster_path: targetGroup.poster_path || null,
        episodes: (targetGroup.episodes || []).map((ep: any) => ({
          id: ep.id,
          name: ep.name,
          overview: ep.overview || "",
          episode_number: ep.episode_number,
          season_number: seasonNum,
          air_date: ep.air_date || null,
          still_path: ep.still_path || null,
          runtime: ep.runtime || null,
          vote_average: ep.vote_average || 0,
          vote_count: ep.vote_count || 0,
        }))
      };

      // Lấy ratings từ OMDB
      let imdbEpisodeRatings: Record<number, string> = {};
      const showTitle = await fetchShowTitle(id);
      if (showTitle) {
        imdbEpisodeRatings = await fetchOmdbSeasonRatings(showTitle, seasonNum);
      }

      return NextResponse.json({ ...mockSeasonDetail, imdbEpisodeRatings });
    }

    // 2. Nếu không có cấu hình tùy chỉnh, lấy mặc định từ TMDB
    const [data, showTitle] = await Promise.all([
      fetchTVSeasonDetails(id, seasonNum),
      fetchShowTitle(id),
    ]);

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

