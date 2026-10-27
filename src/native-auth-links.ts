export type NativeAuthLink = {
  accessToken: string;
  refreshToken: string;
  recovery: boolean;
};

// Accept only the registered account callback. Other app links must never be
// interpreted as sign-in links or copied into the WebView's location/history.
export function parseNativeAuthLink(value: string): NativeAuthLink | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'airstethics:' ||
    url.hostname !== 'auth' ||
    !['', '/'].includes(url.pathname) ||
    url.username ||
    url.password ||
    url.port
  )
    return null;

  const fragment = new URLSearchParams(url.hash.slice(1));
  if (
    fragment.has('error') ||
    fragment.has('error_code') ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_code') ||
    fragment.getAll('access_token').length !== 1 ||
    fragment.getAll('refresh_token').length !== 1 ||
    fragment.getAll('type').length > 1
  )
    return null;
  const accessToken = fragment.get('access_token') ?? '';
  const refreshToken = fragment.get('refresh_token') ?? '';
  if (
    accessToken.length > 16_384 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken) ||
    !refreshToken ||
    refreshToken.length > 1_024 ||
    /\s/.test(refreshToken)
  )
    return null;
  return {
    accessToken,
    refreshToken,
    recovery: fragment.get('type') === 'recovery',
  };
}
