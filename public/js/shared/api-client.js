/**
 * Shared API client placeholder.
 * Centralizing fetch logic here will keep page scripts lean.
 */
export async function apiClient(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  return response;
}
