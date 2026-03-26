export const CAMPUS_LOCATIONS = [
  { value: 'library', label: 'Library', searchQuery: 'Langara College Library Vancouver BC' },
  { value: 'a-building', label: 'A Building', searchQuery: 'Langara College A Building Vancouver BC' },
  { value: 'b-building', label: 'B Building', searchQuery: 'Langara College B Building Vancouver BC' },
  { value: 'c-building', label: 'C Building', searchQuery: 'Langara College C Building Vancouver BC' },
  { value: 'student-services', label: 'Student Services', searchQuery: 'Langara College Student Services Vancouver BC' },
  { value: 'cafeteria', label: 'Cafeteria', searchQuery: 'Langara College Cafeteria Vancouver BC' },
  { value: 'student-union', label: 'Student Union', searchQuery: 'Langara College Student Union Vancouver BC' },
  { value: 'gym', label: 'Gym / Recreation Area', searchQuery: 'Langara College Gym Vancouver BC' },
  { value: 'main-entrance', label: 'Main Entrance', searchQuery: 'Langara College Main Entrance Vancouver BC' },
  { value: 'parking-lot', label: 'Parking Lot', searchQuery: 'Langara College Parking Lot Vancouver BC' },
  { value: 'bus-loop', label: 'Bus Stop / Bus Loop', searchQuery: 'Langara College Bus Loop Vancouver BC' },
  { value: 'security-office', label: 'Security Office', searchQuery: 'Langara College Security Vancouver BC' },
  { value: 'other', label: 'Other campus location', searchQuery: 'Langara College Vancouver BC' }
];

export function getCampusLocationOptions() {
  return CAMPUS_LOCATIONS.map(({ value, label }) => ({ value, label }));
}

export function findCampusLocation(value) {
  return CAMPUS_LOCATIONS.find((location) => location.value === value) || null;
}

export function buildCampusSearchQuery(locationValue, otherText = '') {
  const preset = findCampusLocation(locationValue);

  if (locationValue === 'other' && otherText.trim()) {
    return `Langara College ${otherText.trim()} Vancouver BC`;
  }

  return preset?.searchQuery || 'Langara College Vancouver BC';
}

export function buildCampusDisplayLabel(locationValue, otherText = '') {
  const preset = findCampusLocation(locationValue);

  if (locationValue === 'other' && otherText.trim()) {
    return otherText.trim();
  }

  return preset?.label || '';
}
