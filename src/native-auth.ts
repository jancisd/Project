import { Capacitor } from '@capacitor/core';
import { supabase } from './backend';
import { parseNativeAuthLink } from './native-auth-links';

let started = false;
let lastHandledFingerprint = '';

async function handleAuthLink(value: string) {
  if (!supabase) return;
  const link = parseNativeAuthLink(value);
  if (!link) return;
  try {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    if (fingerprint === lastHandledFingerprint) return;
    // Remember a hash for duplicate warm/cold callbacks, not the token-bearing URL.
    lastHandledFingerprint = fingerprint;
    const { data, error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    });
    if (error || !data.user?.id || !data.session) {
      lastHandledFingerprint = '';
      return;
    }
    if (link.recovery)
      window.dispatchEvent(new Event('airstethics:password-recovery'));
  } catch {
    // Never log a deep link: it contains account credentials. An expired link
    // can be replaced through the existing password-recovery form.
    lastHandledFingerprint = '';
  }
}

export async function initializeNativeAuth(): Promise<void> {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', ({ url }) => {
      void handleAuthLink(url);
    });
    const launch = await App.getLaunchUrl();
    if (launch?.url) await handleAuthLink(launch.url);
  } catch {
    started = false;
  }
}
