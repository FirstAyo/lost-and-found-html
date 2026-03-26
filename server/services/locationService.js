import {
  buildCampusSearchQuery,
  buildCampusDisplayLabel,
  LANGARA_CAMPUS_FALLBACK,
} from "../config/campusLocations.js";

// using OpenStreetMap API to get campus location

function toMapLink(lat, lon, label = "") {
  if (typeof lat !== "number" || typeof lon !== "number") {
    return "";
  }

  const query = encodeURIComponent(label || `${lat},${lon}`);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}&query=${query}`;
}

function buildCampusFallbackLocation(label = "") {
  const fallbackLabel = label
    ? `${label} (mapped to Langara College Main Campus)`
    : LANGARA_CAMPUS_FALLBACK.label;

  return {
    label: fallbackLabel,
    lat: LANGARA_CAMPUS_FALLBACK.lat,
    lon: LANGARA_CAMPUS_FALLBACK.lon,
    mapLink: toMapLink(
      LANGARA_CAMPUS_FALLBACK.lat,
      LANGARA_CAMPUS_FALLBACK.lon,
      fallbackLabel,
    ),
    usedCampusFallback: true,
  };
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
    usedCampusFallback: false,
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
          label: geocoded.label || label,
          searchQuery,
          lat: geocoded.lat,
          lon: geocoded.lon,
          mapLink: geocoded.mapLink,
          usedCampusFallback: false,
        };
      }
    } catch {
      // Graceful fallback: keep app working even if geocoding fails.
    }

    const fallback = buildCampusFallbackLocation(label);

    return {
      label: fallback.label,
      searchQuery,
      lat: fallback.lat,
      lon: fallback.lon,
      mapLink: fallback.mapLink,
      usedCampusFallback: true,
    };
  },

  async previewCampusLocation(locationValue, otherText = "") {
    const label = buildCampusDisplayLabel(locationValue, otherText);
    const searchQuery = buildCampusSearchQuery(locationValue, otherText);

    try {
      const geocoded = await geocodeQuery(searchQuery);
      if (geocoded) {
        return {
          success: true,
          label: geocoded.label || label,
          searchQuery,
          lat: geocoded.lat,
          lon: geocoded.lon,
          mapLink: geocoded.mapLink,
          usedCampusFallback: false,
        };
      }
    } catch {
      // Graceful fallback
    }

    const fallback = buildCampusFallbackLocation(label);

    return {
      success: true,
      label: fallback.label,
      searchQuery,
      lat: fallback.lat,
      lon: fallback.lon,
      mapLink: fallback.mapLink,
      usedCampusFallback: true,
    };
  },
};

export async function geocodeLocation(query) {
  try {
    const geocoded = await geocodeQuery(query);

    if (!geocoded) {
      const fallback = buildCampusFallbackLocation("Selected campus location");
      return {
        lat: fallback.lat,
        lon: fallback.lon,
        displayName: fallback.label,
        mapLink: fallback.mapLink,
        usedCampusFallback: true,
      };
    }

    return {
      lat: geocoded.lat,
      lon: geocoded.lon,
      displayName: geocoded.label,
      mapLink: geocoded.mapLink,
      usedCampusFallback: false,
    };
  } catch (err) {
    console.error("Geocoding error:", err);

    const fallback = buildCampusFallbackLocation("Selected campus location");
    return {
      lat: fallback.lat,
      lon: fallback.lon,
      displayName: fallback.label,
      mapLink: fallback.mapLink,
      usedCampusFallback: true,
    };
  }
}
