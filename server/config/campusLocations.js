const LANGARA_CAMPUS_ADDRESS =
  "Langara College, 100 W 49th Ave, Vancouver, BC, Canada";

export const LANGARA_CAMPUS_FALLBACK = {
  label: "Langara College Main Campus",
  lat: 49.2249,
  lon: -123.1086,
  address: LANGARA_CAMPUS_ADDRESS,
};

export const CAMPUS_LOCATIONS = [
  {
    value: "library",
    label: "Library",
    searchQuery: `Library, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "a-building",
    label: "A Building",
    searchQuery: `A Building, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "b-building",
    label: "B Building",
    searchQuery: `B Building, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "c-building",
    label: "C Building",
    searchQuery: `C Building, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "student-services",
    label: "Student Services",
    searchQuery: `Student Services, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "cafeteria",
    label: "Cafeteria",
    searchQuery: `Cafeteria, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "student-union",
    label: "Student Union",
    searchQuery: `Student Union, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "gym",
    label: "Gym / Recreation Area",
    searchQuery: `Gym, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "main-entrance",
    label: "Main Entrance",
    searchQuery: `Main Entrance, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "parking-lot",
    label: "Parking Lot",
    searchQuery: `Parking Lot, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "bus-loop",
    label: "Bus Stop / Bus Loop",
    searchQuery: `Bus Loop, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "security-office",
    label: "Security Office",
    searchQuery: `Security Office, ${LANGARA_CAMPUS_ADDRESS}`,
  },
  {
    value: "other",
    label: "Other campus location",
    searchQuery: LANGARA_CAMPUS_ADDRESS,
  },
];

export function getCampusLocationOptions() {
  return CAMPUS_LOCATIONS.map(({ value, label }) => ({ value, label }));
}

export function findCampusLocation(value) {
  return CAMPUS_LOCATIONS.find((location) => location.value === value) || null;
}

export function buildCampusSearchQuery(locationValue, otherText = "") {
  const preset = findCampusLocation(locationValue);
  const trimmedOtherText = otherText.trim();

  if (locationValue === "other" && trimmedOtherText) {
    return `${trimmedOtherText}, ${LANGARA_CAMPUS_ADDRESS}`;
  }

  return preset?.searchQuery || LANGARA_CAMPUS_ADDRESS;
}

export function buildCampusDisplayLabel(locationValue, otherText = "") {
  const preset = findCampusLocation(locationValue);

  if (locationValue === "other" && otherText.trim()) {
    return otherText.trim();
  }

  return preset?.label || "";
}
