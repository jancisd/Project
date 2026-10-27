import { Capacitor } from '@capacitor/core';

export function getAuthRedirectUrl(recovery = false): string {
  const url = Capacitor.isNativePlatform()
    ? new URL('airstethics://auth')
    : new URL('/', window.location.origin);
  if (recovery) url.searchParams.set('account', 'recovery');
  return url.href;
}
