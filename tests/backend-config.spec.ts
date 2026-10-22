import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { normalizeProjectUrl } from '../src/backend-config';

test('a copied Data API URL produces valid authentication and database requests', async () => {
  const requests: URL[] = [];
  const client = createClient(
    normalizeProjectUrl(' https://project-example.supabase.co/rest/v1/ '),
    'sb_publishable_test_only',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (input) => {
          const url = new URL(String(input));
          requests.push(url);
          return new Response(url.pathname.startsWith('/auth/') ? '{}' : '[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    },
  );
  await client.auth.signInWithOtp({ email: 'test@example.com' });
  await client.from('listings').select('id');
  expect(requests.map((url) => url.pathname)).toEqual([
    '/auth/v1/otp',
    '/rest/v1/listings',
  ]);
  expect(
    requests.every(
      (url) => url.origin === 'https://project-example.supabase.co',
    ),
  ).toBe(true);
});

test('project roots, custom domains, and local development use their origin', () => {
  expect(normalizeProjectUrl('https://project-example.supabase.co/')).toBe(
    'https://project-example.supabase.co',
  );
  expect(normalizeProjectUrl('https://accounts.example.com')).toBe(
    'https://accounts.example.com',
  );
  expect(normalizeProjectUrl('http://127.0.0.1:54321/rest/v1')).toBe(
    'http://127.0.0.1:54321',
  );
});

test('unrelated paths, embedded credentials, and insecure remote origins fail configuration', () => {
  for (const value of [
    'https://supabase.com/dashboard/project/example',
    'https://example.supabase.co/auth/v1',
    'https://name:password@example.supabase.co',
    'http://example.supabase.co',
    'https://example.supabase.co/?apikey=example',
    'https://example.supabase.co/#access_token=example',
    'not a URL',
  ])
    expect(() => normalizeProjectUrl(value)).toThrow();
});
