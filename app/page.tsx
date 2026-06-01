// Server Component — fetch TMDB data server-side to prevent hydration mismatch
// and improve initial load performance
import { fetchTrending, fetchNowPlaying, fetchTopRated, fetchLatestByCountry } from "@/lib/tmdb";
import { HomeClient } from "@/components/home-client";

export default async function HomePage() {
  // Fetch all lists in parallel
  const [trending, nowPlaying, topRated, latestVietnam] = await Promise.all([
    fetchTrending().catch(() => []),
    fetchNowPlaying().catch(() => []),
    fetchTopRated().catch(() => []),
    fetchLatestByCountry("vietnam").catch(() => []),
  ]);

  return (
    <HomeClient
      initialTrending={trending}
      initialNowPlaying={nowPlaying}
      initialTopRated={topRated}
      initialLatestVietnam={latestVietnam}
    />
  );
}
