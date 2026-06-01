export interface OMDBRatings {
  imdb?: string;
  rottenTomatoes?: string;
  metacritic?: string;
}

export function parseOMDBRatings(data: any): OMDBRatings {
  if (!data) return {};
  const ratings: OMDBRatings = {};
  
  if (data.imdbRating && data.imdbRating !== "N/A") {
    ratings.imdb = data.imdbRating;
  }
  
  if (data.Ratings && Array.isArray(data.Ratings)) {
    const rt = data.Ratings.find((r: any) => r.Source === "Rotten Tomatoes");
    if (rt) ratings.rottenTomatoes = rt.Value; // e.g. "85%"
    
    const meta = data.Ratings.find((r: any) => r.Source === "Metacritic");
    if (meta) ratings.metacritic = meta.Value.split("/")[0]; // e.g. "72"
  }
  
  if (!ratings.metacritic && data.Metascore && data.Metascore !== "N/A") {
    ratings.metacritic = data.Metascore;
  }
  
  return ratings;
}

/**
 * Fetch OMDB data via Next.js API Route (/api/omdb) with localStorage fallback.
 */
export async function getOmdbData(
  tmdbId: number,
  title: string,
  year: number | null,
  mediaType: "movie" | "tv",
  tmdbRating: string = "7.5"
): Promise<any> {
  const now = new Date();
  const localKey = `omdb_cache_${tmdbId}`;

  const getLocal = () => {
    try {
      const localStr = localStorage.getItem(localKey);
      if (localStr) {
        const parsed = JSON.parse(localStr);
        const updatedAt = new Date(parsed.updated_at);
        const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const res = parsed.response;
          const hasRating = res && res.Response === "True" && res.imdbRating && res.imdbRating !== "N/A";
          if (hasRating) {
            return res;
          }
        }
      }
    } catch {}
    return null;
  };

  const saveLocal = (response: any) => {
    try {
      localStorage.setItem(
        localKey,
        JSON.stringify({
          response,
          updated_at: now.toISOString(),
        })
      );
    } catch {}
  };

  // 1. Try our Next.js API Route
  try {
    const yearParam = year ? `&year=${year}` : "";
    const res = await fetch(
      `/api/omdb?tmdbId=${tmdbId}&title=${encodeURIComponent(title)}${yearParam}&mediaType=${mediaType}&tmdbRating=${tmdbRating}`
    );
    
    if (res.ok) {
      const omdbResponse = await res.json();
      saveLocal(omdbResponse);
      return omdbResponse;
    }
  } catch (err) {
    console.warn("API route failed, falling back to localStorage:", err);
  }

  // 2. LocalStorage Fallback (Client-only)
  return getLocal();
}
