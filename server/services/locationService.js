import {
  buildCampusSearchQuery,
  buildCampusDisplayLabel,
} from "../config/campusLocations.js";

// using OpenStreetMap API to get campus location

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
          label: geocoded.label || label,
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
        };
      }
    } catch {
      // Graceful fallback
    }

    return {
      success: false,
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
    const geocoded = await geocodeQuery(query);

    if (!geocoded) {
      return null;
    }

    return {
      lat: geocoded.lat,
      lon: geocoded.lon,
      displayName: geocoded.label,
      mapLink: geocoded.mapLink,
    };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}
