import { NextResponse } from "next/server";
import { buildCacheKey, remember } from "@/lib/utils/cache.js";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";
const REGION = "IN";

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
        .map((p) => ({
          id: p.provider_id,
          name: p.provider_name,
          logo: p.logo_path ? `${TMDB_IMAGE_BASE}${p.logo_path}` : null,
        }));

      return { providers, link: watchLink };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Providers fetch error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
