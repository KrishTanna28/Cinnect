import { NextResponse } from "next/server";
import { buildCacheKey, remember } from "@/lib/utils/cache.js";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";
const REGION = "IN";

// Platform-specific URL builders
const PLATFORM_URLS = {
  8: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`, // Netflix
  119: (title) => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`, // Amazon Prime
  337: (title) => `https://www.hotstar.com/in/search?q=${encodeURIComponent(title)}`, // Disney+ Hotstar
  350: (title) => `https://tv.apple.com/search?q=${encodeURIComponent(title)}`, // Apple TV+
  3: (title) => `https://play.google.com/store/search?q=${encodeURIComponent(title)}&c=movies`, // Google Play
  2: (title) => `https://tv.apple.com/search?q=${encodeURIComponent(title)}`, // Apple iTunes
  192: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}+full+movie`, // YouTube
  283: (title) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`, // Crunchyroll
  // Add more platforms as needed
}

export async function GET(request, { params }) {
  const { type, id } = await params;

  if (!["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be 'movie' or 'tv'." }, { status: 400 });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "TMDB API key not configured." }, { status: 500 });
  }

  try {
    const cacheKey = buildCacheKey("providers", type, id, REGION);
    const data = await remember(cacheKey, 3600, async () => {
      // Fetch media details to get the title
      const detailsUrl = `${TMDB_BASE}/${type}/${id}?api_key=${TMDB_API_KEY}`;
      const detailsRes = await fetch(detailsUrl, { next: { revalidate: 3600 } });

      if (!detailsRes.ok) {
        throw new Error(`TMDB details fetch failed: ${detailsRes.status}`);
      }

      const details = await detailsRes.json();
      const title = details.title || details.name; // title for movies, name for TV

      // Fetch watch providers
      const url = `${TMDB_BASE}/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });

      if (!res.ok) {
        throw new Error(`TMDB providers fetch failed: ${res.status}`);
      }

      const payload = await res.json();
      const regionData = payload.results?.[REGION];

      if (!regionData) {
        return { providers: [], link: null };
      }

      const watchLink = regionData.link || null;
      const providerList =
        regionData.flatrate ||
        regionData.free ||
        regionData.ads ||
        regionData.rent ||
        regionData.buy ||
        [];

      const seen = new Set();
      const providers = providerList
        .filter((p) => {
          if (seen.has(p.provider_id)) return false;
          seen.add(p.provider_id);
          return true;
        })
        .map((p) => {
          // Generate platform-specific link or fallback to TMDB link
          const platformLinkBuilder = PLATFORM_URLS[p.provider_id];
          const providerLink = platformLinkBuilder ? platformLinkBuilder(title) : watchLink;

          return {
            id: p.provider_id,
            name: p.provider_name,
            logo: p.logo_path ? `${TMDB_IMAGE_BASE}${p.logo_path}` : null,
            link: providerLink, // Individual link for each provider
          };
        });

      return { providers, link: watchLink };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Providers fetch error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
