import { NextRequest, NextResponse } from "next/server";
import { upsertMediaCustomization, getMediaCustomization, supabase, STATIC_USER_ID } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const tmdbIdNum = parseInt(id, 10);

  if (isNaN(tmdbIdNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { custom_poster_path, custom_backdrop_path, season_group_id, custom_season_names } = body;

    // Retrieve existing customization to prevent resetting other values
    const existing = await getMediaCustomization(tmdbIdNum, type);

    // Build payload by merging new request fields with existing database fields
    const payload = {
      tmdb_id: tmdbIdNum,
      media_type: type,
      custom_poster_path: custom_poster_path !== undefined ? custom_poster_path : (existing ? existing.custom_poster_path : null),
      custom_backdrop_path: custom_backdrop_path !== undefined ? custom_backdrop_path : (existing ? existing.custom_backdrop_path : null),
      season_group_id: season_group_id !== undefined ? season_group_id : (existing ? existing.season_group_id : null),
      custom_season_names: custom_season_names !== undefined ? custom_season_names : (existing ? existing.custom_season_names : {}),
    };

    const saved = await upsertMediaCustomization(payload);

    if (!saved) {
      return NextResponse.json({ error: "Failed to save customization to database" }, { status: 500 });
    }

    // Synchronize poster_path to existing diary_entries and watchlist if changed
    if (custom_poster_path !== undefined) {
      await Promise.all([
        supabase
          .from("diary_entries")
          .update({ poster_path: custom_poster_path })
          .eq("user_id", STATIC_USER_ID)
          .eq("tmdb_id", tmdbIdNum)
          .eq("media_type", type),
        supabase
          .from("watchlist")
          .update({ poster_path: custom_poster_path })
          .eq("user_id", STATIC_USER_ID)
          .eq("tmdb_id", tmdbIdNum)
          .eq("media_type", type),
      ]);
    }

    return NextResponse.json({ success: true, customization: saved });
  } catch (err: any) {
    console.error(`Failed to customize ${type} ${id}:`, err);
    return NextResponse.json({ error: err.message || "Failed to customize" }, { status: 500 });
  }
}
