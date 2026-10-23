import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Listing } from '../src/data';

const api = 'https://airstethics-test.supabase.co';
const userId = '11111111-1111-4111-8111-111111111111';
const photo = (name = 'inside.webp', source = 'hair') => ({
  name,
  mimeType: 'image/webp',
  buffer: readFileSync(`public/images/${source}.webp`),
});

function session() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'photo-owner@example.com',
    email_confirmed_at: '2026-10-22T12:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-10-22T12:00:00.000Z',
  };
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 3600 })}.test-signature`,
    refresh_token: 'test-photo-refresh-only',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  };
}

function catalogRow(listing: Listing) {
  const { services, ...data } = listing;
  return {
    id: listing.id,
    data,
    is_demo: false,
    services,
    created_at: '2026-10-22T12:00:00.000Z',
  };
}

async function mockPhotoStorage(page: Page) {
  const state = {
    listings: [] as ReturnType<typeof catalogRow>[],
    uploads: [] as { path: string; bytes: number; failed: boolean }[],
    objects: new Set<string>(),
    published: [] as Listing[],
    deleted: [] as string[],
    failUploadAt: 0,
    failPublish: false,
  };
  await page.addInitScript(
    (auth) =>
      localStorage.setItem(
        'sb-airstethics-test-auth-token',
        JSON.stringify(auth),
      ),
    session(),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route(`${api}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    const uploadPrefix = '/storage/v1/object/listing-photos/';
    if (path.startsWith('/storage/v1/object/public/listing-photos/'))
      return route.fulfill({
        status: 200,
        contentType: 'image/webp',
        body: photo().buffer,
      });
    if (path.startsWith(uploadPrefix) && request.method() === 'POST') {
      const objectPath = decodeURIComponent(path.slice(uploadPrefix.length));
      const failed = state.failUploadAt === state.uploads.length + 1;
      state.uploads.push({
        path: objectPath,
        bytes: request.postDataBuffer()?.length ?? 0,
        failed,
      });
      if (failed)
        return reply(
          {
            statusCode: '500',
            error: 'Upload failed',
            message: 'Test storage unavailable',
          },
          500,
        );
      state.objects.add(objectPath);
      return reply({
        Key: `listing-photos/${objectPath}`,
        Id: crypto.randomUUID(),
      });
    }
    if (
      path === '/storage/v1/object/listing-photos' &&
      request.method() === 'DELETE'
    ) {
      const body = request.postDataJSON() as { prefixes: string[] };
      for (const prefix of body.prefixes) {
        state.deleted.push(prefix);
        state.objects.delete(prefix);
      }
      return reply(body.prefixes.map((name) => ({ name })));
    }
    if (path === '/auth/v1/user') return reply(session().user);
    if (path === '/auth/v1/token') return reply(session());
    if (path === '/rest/v1/bookings' || path === '/rest/v1/favorites')
      return reply([]);
    if (path === '/rest/v1/listings') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      return reply(
        id ? state.listings.find((row) => row.id === id) : state.listings,
      );
    }
    if (path === '/rest/v1/rpc/create_listing') {
      const candidate = (request.postDataJSON() as { p_listing: Listing })
        .p_listing;
      state.published.push(candidate);
      if (state.failPublish)
        return reply(
          { code: 'XX000', message: 'Test database unavailable' },
          500,
        );
      const listing = {
        ...candidate,
        id: '33333333-3333-4333-8333-333333333333',
      };
      const row = catalogRow(listing);
      state.listings = [row];
      return reply(row);
    }
    return reply({ message: `Unexpected photo-test route ${path}` }, 400);
  });
  return state;
}

async function openPhotoForm(page: Page, name: string): Promise<Locator> {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Account', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Loading your places and appointments…'),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Make yourself at home', exact: true })
    .click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Your space’s name', { exact: true }).fill(name);
  await form.getByLabel('Your name', { exact: true }).fill('Photo Owner');
  await form
    .getByLabel('Neighbourhood', { exact: true })
    .fill('Old Strathcona');
  await form
    .getByLabel('Tell us a little about your space', { exact: true })
    .fill(
      'An independent beauty studio with a welcoming space and thoughtful services.',
    );
  await form
    .getByLabel('Service name', { exact: true })
    .fill('Signature styling');
  await form.getByLabel('Price (CAD)', { exact: true }).fill('85');
  return form;
}

test('listing photos upload only on publish, preserve the chosen cover, and reload as a shared gallery', async ({
  page,
}) => {
  const db = await mockPhotoStorage(page);
  const name = 'Shared photo gallery';
  const form = await openPhotoForm(page, name);
  await form
    .getByLabel('Listing photos', { exact: true })
    .setInputFiles([photo(), photo('nails.webp', 'nails')]);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(2);
  expect(db.uploads).toHaveLength(0);
  await form
    .getByRole('button', { name: 'Make nails.webp cover', exact: true })
    .click();
  await expect(
    form.getByTestId('listing-photo-preview').first(),
  ).toHaveAttribute('data-cover', 'true');
  await expect(
    form.getByTestId('listing-photo-preview').first().getByRole('img'),
  ).toHaveAttribute('alt', 'Preview of nails.webp');
  await form
    .getByRole('button', { name: 'Publish my space', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  expect(db.uploads).toHaveLength(2);
  expect(
    db.uploads.every(
      (upload) => upload.path.startsWith(`${userId}/`) && upload.bytes > 0,
    ),
  ).toBe(true);
  const listing = db.published[0];
  expect(listing.images).toHaveLength(2);
  expect(
    listing.images.every((url) =>
      url.startsWith(
        `${api}/storage/v1/object/public/listing-photos/${userId}/`,
      ),
    ),
  ).toBe(true);
  expect(listing.image).toBe(listing.images[0]);
  expect(
    listing.images.some(
      (url) => url.startsWith('blob:') || url.startsWith('data:'),
    ),
  ).toBe(false);
  const card = page.getByTestId('listing-card').filter({ hasText: name });
  await expect(card.locator('.listing-image')).toHaveAttribute(
    'src',
    listing.image,
  );
  await page.reload();
  await page.getByRole('button', { name: `View ${name}`, exact: true }).click();
  const details = page.getByTestId('listing-details');
  await expect(
    details.locator('.listing-details-main-photo img'),
  ).toHaveAttribute('src', listing.images[0]);
  await details
    .getByRole('button', { name: `Show photo 2 of ${name}`, exact: true })
    .click();
  await expect(
    details.locator('.listing-details-main-photo img'),
  ).toHaveAttribute('src', listing.images[1]);
  expect(
    await page.evaluate(() => localStorage.getItem('airstethics:listings')),
  ).toBeNull();
});

test('a partial photo upload failure preserves the form and safely retries the gallery', async ({
  page,
}) => {
  const db = await mockPhotoStorage(page);
  db.failUploadAt = 2;
  const form = await openPhotoForm(page, 'Retry photo gallery');
  await form
    .getByLabel('Listing photos', { exact: true })
    .setInputFiles([photo(), photo('nails.webp', 'nails')]);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(2);
  await form
    .getByRole('button', { name: 'Publish my space', exact: true })
    .click();
  await expect(form.getByRole('alert')).toContainText(/photo|upload/i);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(2);
  await expect(
    form.getByLabel('Your space’s name', { exact: true }),
  ).toHaveValue('Retry photo gallery');
  expect(db.published).toHaveLength(0);
  db.failUploadAt = 0;
  await form
    .getByRole('button', { name: 'Publish my space', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  expect(db.objects.size).toBe(2);
  expect(db.deleted).toContain(db.uploads[0].path);
  expect(db.published[0].images).toHaveLength(2);
  for (const url of db.published[0].images)
    expect(db.objects.has(url.split('/public/listing-photos/')[1])).toBe(true);
});

test('a failed listing save keeps uploaded photos and retries the same listing without duplicate uploads', async ({
  page,
}) => {
  const db = await mockPhotoStorage(page);
  db.failPublish = true;
  const form = await openPhotoForm(page, 'Database retry gallery');
  await form
    .getByLabel('Listing photos', { exact: true })
    .setInputFiles([photo()]);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(1);
  await form
    .getByRole('button', { name: 'Publish my space', exact: true })
    .click();
  await expect(form.getByRole('alert')).toContainText(/couldn’t publish/i);
  expect(db.uploads).toHaveLength(1);
  expect(db.deleted).toHaveLength(0);
  db.failPublish = false;
  await form
    .getByRole('button', { name: 'Publish my space', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  expect(db.uploads).toHaveLength(1);
  expect(db.published).toHaveLength(2);
  expect(db.published[0].id).toBe(db.published[1].id);
  expect(db.published[0].images).toEqual(db.published[1].images);
});

test('invalid photos are rejected and removing a selected photo prevents its upload', async ({
  page,
}) => {
  const db = await mockPhotoStorage(page);
  const form = await openPhotoForm(page, 'Photo selection checks');
  const input = form.getByLabel('Listing photos', { exact: true });
  await input.setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(form.getByRole('alert')).toContainText(/JPEG|PNG|WebP/i);
  await input.setInputFiles({
    name: 'oversized.webp',
    mimeType: 'image/webp',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(form.getByRole('alert')).toContainText(/5\s?MB/i);
  await input.setInputFiles({
    name: 'broken.webp',
    mimeType: 'image/webp',
    buffer: Buffer.from('not an image'),
  });
  await expect(form.getByRole('alert')).toContainText(/image|photo|read|open/i);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(0);
  await input.setInputFiles([photo(), photo('nails.webp', 'nails')]);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(2);
  await form
    .getByRole('button', { name: 'Remove inside.webp', exact: true })
    .click();
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(1);
  expect(db.uploads).toHaveLength(0);
  await form
    .getByRole('button', { name: 'Publish my space', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  expect(db.uploads).toHaveLength(1);
  expect(db.published[0].images).toHaveLength(1);
});
