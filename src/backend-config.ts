// Supabase's Data API panel also offers a /rest/v1/ endpoint. The SDK needs
// the project origin so that authentication and database URLs share that root.
export function normalizeProjectUrl(value: string): string {
  const url = new URL(value.trim());
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )) ||
    !['', '/', '/rest/v1', '/rest/v1/'].includes(url.pathname)
  )
    throw new Error('Invalid project URL');
  return url.origin;
}
