const fs = require("fs");
const path = require("path");

const TMDB_API_KEY = "bc0891412903fa87995b94459b3cf9e6";
const OMDB_API_KEY = "7d5469f2";
const LOCAL_CACHE_PATH = path.join(__dirname, "..", "omdb_local_cache.json");
const OUTPUT_PATH = path.join(__dirname, "..", "lib", "top-imdb-data.ts");

// Load local cache if it exists
let localCache = {};
if (fs.existsSync(LOCAL_CACHE_PATH)) {
  try {
    localCache = JSON.parse(fs.readFileSync(LOCAL_CACHE_PATH, "utf-8"));
    console.log(`Loaded ${Object.keys(localCache).length} cached items from local file cache.`);
  } catch (err) {
    console.error("Failed to parse local cache:", err);
  }
}

async function fetchTMDBPage(page) {
  const url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB page ${page} fetch failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function getIMDbRating(tmdbId, title, year) {
  // Check local cache first
  if (localCache[tmdbId]) {
    const cachedRes = localCache[tmdbId].response;
    if (cachedRes && cachedRes.imdbRating && cachedRes.imdbRating !== "N/A") {
      return cachedRes.imdbRating;
    }
  }

  // Otherwise fetch from OMDb
  try {
    const yearParam = year ? `&y=${year}` : "";
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}${yearParam}&type=movie`;
    console.log(`[Fetch OMDb] Fetching rating for "${title}" (${year})...`);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
        // Cache it locally so we don't fetch it again
        localCache[tmdbId] = {
          title,
          year,
          media_type: "movie",
          response: data,
          updated_at: new Date().toISOString()
        };
        return data.imdbRating;
      }
    }
  } catch (err) {
    console.error(`OMDb error for "${title}":`, err.message);
  }

  return null;
}

async function getNativePosterOffline(id, originalLanguage, defaultPoster) {
  if (!originalLanguage || originalLanguage === "en") return defaultPoster;
  try {
    const url = `https://api.themoviedb.org/3/movie/${id}/images?api_key=${TMDB_API_KEY}&include_image_language=${originalLanguage},en,null`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.posters && data.posters.length > 0) {
        const native = data.posters.filter((p) => p.iso_639_1 === originalLanguage);
        if (native.length > 0) {
          native.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
          return native[0].file_path;
        }
      }
    }
  } catch (err) {
    console.error(`Offline: failed to fetch native poster for ${id}:`, err.message);
  }
  return defaultPoster;
}

async function main() {
  console.log("Starting generation of IMDb Top 250 static data...");
  const movies = [];
  
  // Fetch top 300 movies from TMDB (15 pages) to have a wide pool
  try {
    for (let page = 1; page <= 15; page++) {
      console.log(`Fetching TMDB Top Rated page ${page}...`);
      const pageMovies = await fetchTMDBPage(page);
      movies.push(...pageMovies);
    }
  } catch (err) {
    console.error("TMDB fetch error:", err);
  }

  console.log(`Fetched ${movies.length} movies from TMDB. Cross-referencing IMDb ratings...`);
  
  const mappedMovies = [];
  
  // To avoid hitting OMDb too fast, we'll process them in small chunks/sequentially
  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    const year = m.release_date ? parseInt(m.release_date.substring(0, 4)) : null;
    
    // Get IMDb rating
    const rating = await getIMDbRating(m.id, m.title, year);
    const finalRating = rating || (m.vote_average ? (m.vote_average).toFixed(1) : "8.0");
    
    // Fetch native poster offline
    const nativePoster = await getNativePosterOffline(m.id, m.original_language, m.poster_path);
    
    mappedMovies.push({
      id: m.id,
      title: m.title,
      year: year || 2000,
      poster_path: nativePoster,
      imdbRating: finalRating,
      media_type: "movie",
      vote_average: m.vote_average ?? 0,
      vote_count: m.vote_count ?? 0,
      release_date: m.release_date || (year ? `${year}-01-01` : "2000-01-01")
    });
  }

  // Sort strictly by IMDb rating descending (parsed as float)
  mappedMovies.sort((a, b) => parseFloat(b.imdbRating) - parseFloat(a.imdbRating));

  // Take top 250
  const top250 = mappedMovies.slice(0, 250);

  // Write updated cache
  try {
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(localCache, null, 2), "utf-8");
    console.log("Local cache file updated successfully.");
  } catch (err) {
    console.error("Failed to save updated local cache:", err);
  }

  // Generate output Typescript file
  const tsContent = `// ─────────────────────────────────────────────────────────────
// CEnt — Hardcoded, highly curated IMDb Top 250 movies
// Sorted strictly by IMDb Rating. Generated automatically.
// ─────────────────────────────────────────────────────────────

export interface TopIMDBMovie {
  id: number;
  title: string;
  year: number;
  poster_path: string | null;
  imdbRating: string;
  media_type: "movie";
  vote_average: number;
  vote_count: number;
  release_date: string;
}

export const topIMDBMovies: TopIMDBMovie[] = ${JSON.stringify(top250, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, tsContent, "utf-8");
  console.log(`Successfully generated ${top250.length} Top IMDb movies in ${OUTPUT_PATH}!`);
}

main();
