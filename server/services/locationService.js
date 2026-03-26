import {
  buildCampusSearchQuery,
  buildCampusDisplayLabel,
} from "../config/campusLocations.js";

//using openstreet Map API to get campus location

function toMapLink(lat, lon, label = "") {
  if (typeof lat !== "number" || typeof lon !== "number") {
    return "";
  }

  const query = encodeURIComponent(label || `${lat},${lon}`);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}&query=${query}`;
}

async function geocodeQuery(query) {
  if (!query) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ca");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "langara-lost-found-student-project/1.0 (contact via project app)",
      "Accept-Language": "en-CA,en;q=0.9",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const result = Array.isArray(data) ? data[0] : null;

  if (!result?.lat || !result?.lon) {
    return null;
  }

  const lat = Number(result.lat);
  const lon = Number(result.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    label: result.display_name || query,
    lat,
    lon,
    mapLink: toMapLink(lat, lon, result.display_name || query),
  };
}

export const locationService = {
  async buildCampusLocationPreview(locationValue, otherText = "") {
    const label = buildCampusDisplayLabel(locationValue, otherText);
    const searchQuery = buildCampusSearchQuery(locationValue, otherText);

    try {
      const geocoded = await geocodeQuery(searchQuery);
      if (geocoded) {
        return {
          label: label || geocoded.label,
          searchQuery,
          lat: geocoded.lat,
          lon: geocoded.lon,
          mapLink: geocoded.mapLink,
        };
      }
    } catch {
      // Graceful fallback: keep app working even if geocoding fails.
    }

    return {
      label,
      searchQuery,
      lat: null,
      lon: null,
      mapLink: "",
    };
  },
};

export async function geocodeLocation(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "lost-found-app",
      },
    });

    const data = await response.json();

    if (!data || data.length === 0) return null;

    return {
      lat: data[0].lat,
      lon: data[0].lon,
      displayName: data[0].display_name,
    };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}
