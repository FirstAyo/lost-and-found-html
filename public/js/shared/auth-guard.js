/**
 * Client-side auth helpers can live here later.
 * Actual authorization will still be enforced on the server.
 */
export function hasClientSession() {
  return Boolean(document.body.dataset.authenticated === 'true');
}
