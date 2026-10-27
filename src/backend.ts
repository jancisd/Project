import { createClient } from '@supabase/supabase-js';
import type { Listing } from './data';
import type { Booking } from './types';
import { isBookingArray, isListingArray } from './storage';
import { normalizeProjectUrl } from './backend-config';
import { isListingSchedule, type ListingSchedule } from './availability';

export type BusySlot = { time: string; duration: number };

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const publicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

function configurationError() {
  if (!projectUrl && !publicKey) return '';
  if (!projectUrl || !publicKey)
    return 'The database connection is incomplete. Please contact the site owner.';
  try {
    normalizeProjectUrl(projectUrl);
    if (publicKey.startsWith('sb_secret_')) throw new Error();
    if (publicKey.startsWith('eyJ')) {
      const payload = JSON.parse(
        atob(publicKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as { role?: string };
      if (payload.role !== 'anon') throw new Error();
    }
  } catch {
    return 'The database connection is invalid. Please contact the site owner.';
  }
  return '';
}

export const backendError = configurationError();
export const cloudEnabled = Boolean(projectUrl || publicKey);
export const supabase =
  cloudEnabled && !backendError
    ? createClient(normalizeProjectUrl(projectUrl), publicKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

function database() {
  if (!supabase)
    throw new Error(backendError || 'The database is not connected.');
  return supabase;
}

function fail(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (!error) return;
  if (
    error.code === '23P01' ||
    /overlap|just booked|already booked/i.test(error.message ?? '')
  )
    throw new Error('That time was just booked. Please choose another time.');
  if (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    /not authenticated|sign in|authentication required/i.test(
      error.message ?? '',
    )
  )
    throw new Error('Please sign in again to continue.');
  if (
    /date|past|opening|closing|future|90 days|booking time/i.test(
      error.message ?? '',
    )
  )
    throw new Error(
      'Please choose a future appointment within 90 days, between 9 AM and 6 PM Alberta time.',
    );
  throw new Error(fallback);
}

function listingFromRow(row: Record<string, unknown>): Listing {
  const data = row.data as Record<string, unknown>;
  const services = row.services as Record<string, unknown>[];
  if (!data || !Array.isArray(services))
    throw new Error('The database returned an invalid listing.');
  const listing = {
    ...data,
    id: row.id,
    isDemo: row.is_demo === true,
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      duration: Number(service.duration),
      price: Number(service.price),
    })),
  };
  const candidates: unknown = [listing];
  if (!isListingArray(candidates))
    throw new Error('The database returned an invalid listing.');
  return candidates[0];
}

function bookingFromRow(row: Record<string, unknown>): Booking {
  const date = new Date(String(row.created_at));
  const booking = {
    id: row.id,
    listingId: row.listing_id,
    listingName: row.listing_name,
    listingImage: row.listing_image,
    city: row.city,
    serviceName: row.service_name,
    date: row.booking_date,
    time: String(row.booking_time).slice(0, 5),
    duration: Number(row.duration),
    price: Number(row.price),
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    createdAt: Number.isFinite(date.getTime()) ? date.toISOString() : '',
    status: row.status,
  };
  const candidates: unknown = [booking];
  if (!isBookingArray(candidates))
    throw new Error('The database returned an invalid appointment.');
  return candidates[0];
}

function rpcRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!row || typeof row !== 'object' || Array.isArray(row))
    throw new Error(
      'We couldn’t confirm the saved information. Please try again.',
    );
  return row as Record<string, unknown>;
}

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await database()
    .from('listings')
    .select('id,data,is_demo,services(*)')
    .order('created_at', { ascending: false });
  fail(error, 'We couldn’t load the listings. Please try again.');
  if (!data)
    throw new Error('We couldn’t load the listings. Please try again.');
  return data.map(listingFromRow);
}

export async function fetchAccountData(userId: string) {
  const client = database();
  const [appointments, favourites] = await Promise.all([
    client
      .from('bookings')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false }),
    client.from('favorites').select('listing_id').eq('user_id', userId),
  ]);
  fail(
    appointments.error,
    'We couldn’t load your appointments. Please try again.',
  );
  fail(
    favourites.error,
    'We couldn’t load your saved places. Please try again.',
  );
  return {
    bookings: (appointments.data ?? []).map(bookingFromRow),
    saved: (favourites.data ?? []).map((row) => String(row.listing_id)),
  };
}

export async function fetchHostDashboard(): Promise<{
  listings: Listing[];
  bookings: Booking[];
}> {
  const { data, error } = await database().rpc('get_host_dashboard');
  fail(error, 'We couldn’t load your business. Please try again.');
  const dashboard = rpcRow(data);
  if (!Array.isArray(dashboard.listings) || !Array.isArray(dashboard.bookings))
    throw new Error('We couldn’t load your business. Please try again.');
  return {
    listings: dashboard.listings.map(listingFromRow),
    bookings: dashboard.bookings.map(bookingFromRow),
  };
}

export async function saveFavourite(
  userId: string,
  listingId: string,
  saved: boolean,
) {
  const client = database();
  const { error } = saved
    ? await client
        .from('favorites')
        .upsert(
          { user_id: userId, listing_id: listingId },
          { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
        )
    : await client
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId);
  fail(error, 'We couldn’t update your saved places. Please try again.');
}

export async function publishListing(
  listing: Listing,
  additionalLocation = false,
): Promise<Listing> {
  const client = database();
  const result = await client.rpc(
    additionalLocation ? 'create_additional_listing' : 'create_listing',
    { p_listing: listing },
  );
  if (result.error?.code === '23514')
    throw new Error(
      'You already have a space. Open My business to edit it, or choose Add another location for a separate space.',
    );
  fail(
    result.error,
    'We couldn’t publish your listing. Your details are still here; please try again.',
  );
  const id = rpcRow(result.data).id;
  if (typeof id !== 'string' || !id)
    throw new Error('We couldn’t confirm your listing. Please try again.');
  const { data, error } = await client
    .from('listings')
    .select('id,data,is_demo,services(*)')
    .eq('id', id)
    .single();
  fail(
    error,
    'Your listing was saved, but we couldn’t reload it. Please try again.',
  );
  return listingFromRow(data!);
}

export async function updateHostedListing(listing: Listing): Promise<Listing> {
  const client = database();
  const result = await client.rpc('update_listing', {
    p_listing_id: listing.id,
    p_listing: listing,
  });
  fail(
    result.error,
    'We couldn’t save your space. Your changes are still here; please try again.',
  );
  if (rpcRow(result.data).id !== listing.id)
    throw new Error('We couldn’t confirm your changes. Please try again.');
  const { data, error } = await client
    .from('listings')
    .select('id,data,is_demo,services(*)')
    .eq('id', listing.id)
    .single();
  fail(error, 'Your space was saved, but we couldn’t reload it. Please retry.');
  return listingFromRow(data!);
}

export async function cancelHostReservation(id: string): Promise<Booking> {
  const { data, error } = await database().rpc('host_cancel_booking', {
    p_id: id,
  });
  fail(error, 'We couldn’t cancel this appointment. Please try again.');
  if (!data)
    throw new Error('We couldn’t confirm the cancellation. Please try again.');
  return bookingFromRow(rpcRow(data));
}

export async function reserveBooking(
  booking: Booking,
  serviceId: string,
): Promise<Booking> {
  const { data, error } = await database().rpc('create_booking', {
    p_listing_id: booking.listingId,
    p_service_id: serviceId,
    p_date: booking.date,
    p_time: booking.time,
    p_guest_name: booking.guestName,
    p_guest_email: booking.guestEmail,
    p_id: booking.id,
  });
  fail(
    error,
    'We couldn’t save your appointment. Please check your connection and try again.',
  );
  if (!data)
    throw new Error('We couldn’t confirm your appointment. Please try again.');
  const saved = bookingFromRow(rpcRow(data));
  if (saved.status !== 'confirmed')
    throw new Error(
      'That booking was already cancelled. Close this form and choose a time again.',
    );
  return saved;
}

export async function cancelReservation(id: string): Promise<Booking> {
  const { data, error } = await database().rpc('cancel_booking', { p_id: id });
  fail(error, 'We couldn’t cancel your appointment. Please try again.');
  if (!data)
    throw new Error('We couldn’t confirm the cancellation. Please try again.');
  return bookingFromRow(rpcRow(data));
}

export async function fetchAvailability(
  listingId: string,
  date: string,
): Promise<BusySlot[]> {
  const { data, error } = await database().rpc('listing_availability', {
    p_listing_id: listingId,
    p_date: date,
  });
  fail(error, 'We couldn’t check available times. Please try again.');
  if (!Array.isArray(data))
    throw new Error('We couldn’t check available times. Please try again.');
  return data.map((row: Record<string, unknown>) => {
    const time = String(row.booking_time).slice(0, 5);
    const duration = Number(row.duration);
    if (
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    )
      throw new Error('We couldn’t check available times. Please try again.');
    return { time, duration };
  });
}

export async function fetchListingSchedule(
  listingId: string,
): Promise<ListingSchedule> {
  const { data, error } = await database().rpc('get_listing_schedule', {
    p_listing_id: listingId,
  });
  fail(error, 'We couldn’t load the opening hours. Please try again.');
  if (!isListingSchedule(data))
    throw new Error('We couldn’t load the opening hours. Please try again.');
  return data;
}

export async function saveListingSchedule(
  listingId: string,
  schedule: ListingSchedule,
): Promise<ListingSchedule> {
  if (!isListingSchedule(schedule))
    throw new Error(
      'Please check your opening hours, breaks, and blocked dates.',
    );
  const { data, error } = await database().rpc('update_listing_schedule', {
    p_listing_id: listingId,
    p_schedule: schedule,
  });
  fail(
    error,
    'We couldn’t save your availability. Your changes are still here; please retry.',
  );
  if (!isListingSchedule(data))
    throw new Error('We couldn’t confirm your availability. Please retry.');
  return data;
}

export async function fetchAvailableSlots(
  listingId: string,
  date: string,
  serviceId: string,
): Promise<string[]> {
  const { data, error } = await database().rpc('available_booking_slots', {
    p_listing_id: listingId,
    p_date: date,
    p_service_id: serviceId,
  });
  fail(error, 'We couldn’t check available times. Please try again.');
  if (!Array.isArray(data))
    throw new Error('We couldn’t check available times. Please try again.');
  return data.map((row: Record<string, unknown>) => {
    const value = String(row.booking_time).slice(0, 5);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
      throw new Error('We couldn’t check available times. Please try again.');
    return value;
  });
}
