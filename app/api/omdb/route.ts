import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { supabase } from "@/lib/supabase";

const OMDB_API_KEY = process.env.OMDB_API_KEY || "7d5469f2";
const LOCAL_CACHE_PATH = path.join(process.cwd(), "omdb_local_cache.json");

interface ScraperResult {
  rating?: string | null;
  error?: string;
}

// Đọc dữ liệu từ file cache cục bộ trên server
function getLocalCache(tmdbId: number): any | null {
  try {
    if (fs.existsSync(LOCAL_CACHE_PATH)) {
      const fileData = fs.readFileSync(LOCAL_CACHE_PATH, "utf-8");
      const cache = JSON.parse(fileData);
      const cached = cache[tmdbId];
      if (cached) {
        const now = new Date();
        const updatedAt = new Date(cached.updated_at);
        const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const res = cached.response;
          const hasRating = res && res.Response === "True" && res.imdbRating && res.imdbRating !== "N/A";
          if (hasRating) {
            return res;
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to read local cache file:", err);
  }
  return null;
}

// Ghi dữ liệu vào file cache cục bộ trên server
function saveLocalCache(tmdbId: number, title: string, year: number | null, mediaType: string, response: any) {
  try {
    let cache: Record<number, any> = {};
    if (fs.existsSync(LOCAL_CACHE_PATH)) {
      const fileData = fs.readFileSync(LOCAL_CACHE_PATH, "utf-8");
      cache = JSON.parse(fileData);
    }
    cache[tmdbId] = {
      title,
      year,
      media_type: mediaType,
      response,
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
    console.log(`Saved ${title} to local file cache`);
  } catch (err) {
    console.error("Failed to write local cache file:", err);
  }
}

// Chạy Python script fetch_imdb.py
function runPythonScraper(title: string, year: number | null, mediaType: string, tmdbRating: string): Promise<ScraperResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "fetch_imdb.py");
    const yearVal = year ? String(year) : "null";
    
    // Command escaping an toàn
    const escapedTitle = title.replace(/"/g, '\\"');
    const cmd = `python "${scriptPath}" "${escapedTitle}" ${yearVal} "${mediaType}" "${tmdbRating}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Python exec error:", error);
        resolve({ rating: tmdbRating, error: error.message });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        console.error("Failed to parse Python scraper output:", stdout, err);
        resolve({ rating: tmdbRating, error: "JSON parse failed" });
      }
    });
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmdbIdStr = searchParams.get("tmdbId");
  const title = searchParams.get("title");
  const yearStr = searchParams.get("year");
  const mediaType = searchParams.get("mediaType") || "movie";
  const tmdbRating = searchParams.get("tmdbRating") || "7.5";

  if (!tmdbIdStr || !title) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const tmdbId = parseInt(tmdbIdStr);
  const year = yearStr ? parseInt(yearStr) : null;
  const now = new Date();

  // 1. Kiểm tra cache cục bộ (local file) trước (cực nhanh, giúp bảo vệ API key)
  const localCachedResponse = getLocalCache(tmdbId);
  if (localCachedResponse) {
    console.log(`[Cache Hit - Local File] Loaded "${title}" from local JSON cache`);
    return NextResponse.json(localCachedResponse);
  }

  try {
    // 2. Kiểm tra cache trong Supabase Database
    const { data: cached, error: dbError } = await supabase
      .from("omdb_cache")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (!dbError && cached) {
      const updatedAt = new Date(cached.updated_at);
      const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        const res = cached.response;
        const hasRating = res && res.Response === "True" && res.imdbRating && res.imdbRating !== "N/A";
        if (hasRating) {
          // Đồng bộ ngược lại file cache cục bộ
          saveLocalCache(tmdbId, title, year, mediaType, cached.response);
          console.log(`[Cache Hit - Supabase DB] Loaded "${title}" from Supabase database`);
          return NextResponse.json(cached.response);
        }
      }
    }

    // 3. Fetch mới từ OMDB API (do hết hạn hoặc chưa được cache)
    console.log(`[Cache Miss] Fetching "${title}" from OMDb API...`);
    const typeParam = mediaType === "tv" ? "series" : "movie";
    const yearParam = year ? `&y=${year}` : "";
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}${yearParam}&type=${typeParam}`;

    let omdbResponse: any = null;
    try {
      const res = await fetch(url);
      if (res.ok) {
        omdbResponse = await res.json();
      }
    } catch (fetchErr) {
      console.error("OMDb API fetch error:", fetchErr);
    }

    // 4. Nếu phim bị thiếu điểm hoặc không tìm thấy trên OMDb, dùng Python imdbinfo để bổ sung
    const hasNoImdbRating = !omdbResponse || omdbResponse.Response === "False" || !omdbResponse.imdbRating || omdbResponse.imdbRating === "N/A";

    if (hasNoImdbRating) {
      console.log(`IMDb rating is missing or OMDb failed for "${title}". Running Python imdbinfo scraper (fallback: ${tmdbRating})...`);
      const pyResult = await runPythonScraper(title, year, mediaType, tmdbRating);
      
      if (pyResult.rating) {
        if (!omdbResponse || omdbResponse.Response === "False") {
          omdbResponse = {
            Response: "True",
            Title: title,
            Year: year ? String(year) : "",
            imdbID: pyResult.imdbID || "",
            imdbRating: pyResult.rating,
            Ratings: [{ Source: "Internet Movie Database", Value: `${pyResult.rating}/10` }]
          };
        } else {
          omdbResponse.imdbRating = pyResult.rating;
          if (!omdbResponse.Ratings) omdbResponse.Ratings = [];
          const existingIMDbIndex = omdbResponse.Ratings.findIndex((r: any) => r.Source === "Internet Movie Database");
          if (existingIMDbIndex > -1) {
            omdbResponse.Ratings[existingIMDbIndex].Value = `${pyResult.rating}/10`;
          } else {
            omdbResponse.Ratings.push({ Source: "Internet Movie Database", Value: `${pyResult.rating}/10` });
          }
        }
        console.log(`Successfully patched IMDb rating via Python scraper: ${pyResult.rating}`);
      } else if (!omdbResponse) {
        // Fallback tối hậu nếu cả OMDb lẫn Python đều thất bại
        omdbResponse = {
          Response: "True",
          Title: title,
          Year: year ? String(year) : "",
          imdbRating: tmdbRating,
          Ratings: [{ Source: "Internet Movie Database", Value: `${tmdbRating}/10` }]
        };
      }
    }

    // 5. Ghi cache cục bộ (local file)
    saveLocalCache(tmdbId, title, year, mediaType, omdbResponse);

    // 6. Ghi cache vào Supabase Database (cố gắng ghi, nếu bảng chưa có thì bỏ qua không crash)
    try {
      if (cached) {
        await supabase
          .from("omdb_cache")
          .update({
            response: omdbResponse,
            updated_at: now.toISOString(),
          })
          .eq("tmdb_id", tmdbId);
      } else {
        await supabase
          .from("omdb_cache")
          .insert({
            tmdb_id: tmdbId,
            title,
            year,
            media_type: mediaType,
            response: omdbResponse,
            updated_at: now.toISOString(),
          });
      }
    } catch (dbWriteErr) {
      console.warn("Supabase database cache write skipped (migration might not be run yet):", dbWriteErr);
    }

    return NextResponse.json(omdbResponse);
  } catch (err: any) {
    console.error("API Route /api/omdb error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
