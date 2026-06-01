// Server Component — fetch TMDB TV data server-side to prevent hydration mismatch
// and improve initial load performance
import {
  fetchTrendingTV,
  fetchOnTheAirTV,
  fetchTopRatedTV,
  fetchLatestTVByCountry,
} from "@/lib/tmdb";
import { TVSeriesClient } from "@/components/tv-series-client";

export default async function TVSeriesPage() {
  // Fetch all TV series lists in parallel
  const [trending, onTheAir, topRated, latestChina] = await Promise.all([
    fetchTrendingTV().catch(() => []),
    fetchOnTheAirTV().catch(() => []),
    fetchTopRatedTV().catch(() => []),
    fetchLatestTVByCountry("china").catch(() => []),
  ]);

  return (
    <TVSeriesClient
      initialTrending={trending}
      initialOnTheAir={onTheAir}
      initialTopRated={topRated}
      initialLatestChina={latestChina}
    />
  );
}
