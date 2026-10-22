import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listings as demoListings } from './data';
import type { Listing } from './data';
import type { Booking } from './types';
import {
  isBookingArray,
  isListingArray,
  isStringArray,
  readStored,
} from './storage';
import {
  backendError,
  cloudEnabled,
  supabase,
  fetchListings,
  fetchAccountData,
  saveFavourite,
  publishListing,
  reserveBooking,
  cancelReservation,
} from './backend';

export default function useMarketplace() {
  const [demoSaved, setDemoSaved] = useState<string[]>(() =>
    cloudEnabled ? [] : readStored('airstethics:saved', [], isStringArray),
  );
  const [demoBookings, setDemoBookings] = useState<Booking[]>(() =>
    cloudEnabled ? [] : readStored('airstethics:bookings', [], isBookingArray),
  );
  const [demoLocalListings, setDemoLocalListings] = useState<Listing[]>(() =>
    cloudEnabled ? [] : readStored('airstethics:listings', [], isListingArray),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [authError, setAuthError] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listingLoading, setListingLoading] = useState(cloudEnabled);
  const [accountLoading, setAccountLoading] = useState(false);
  const [listingError, setListingError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const accountRef = useRef<{ id: string | null; generation: number }>({
    id: null,
    generation: 0,
  });
  const mounted = useRef(true);
  const favoriteRequests = useRef(new Set<string>());
  const listingRevision = useRef(0);
  const accountRevision = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (cloudEnabled) return;
    try {
      localStorage.setItem('airstethics:saved', JSON.stringify(demoSaved));
      localStorage.setItem(
        'airstethics:bookings',
        JSON.stringify(demoBookings),
      );
      localStorage.setItem(
        'airstethics:listings',
        JSON.stringify(demoLocalListings),
      );
    } catch {
      setStorageError(
        'Browser storage is unavailable. Changes will last for this visit only.',
      );
    }
  }, [demoSaved, demoBookings, demoLocalListings]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let receivedEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      const id = nextSession?.user.id ?? null;
      if (id !== accountRef.current.id) {
        accountRef.current = {
          id,
          generation: accountRef.current.generation + 1,
        };
        setSaved([]);
        setBookings([]);
        setAccountError('');
        setAccountLoading(Boolean(id));
      }
      setSession(nextSession);
      setAuthReady(true);
      setAuthError('');
    });
    void supabase.auth.getSession().then(({ error }) => {
      if (active && error) {
        setAuthReady(true);
        setAuthError('We couldn’t restore your account. Please sign in again.');
      } else if (active && !receivedEvent) {
        setAuthReady(true);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const revision = listingRevision.current;
    setListingLoading(true);
    setListingError('');
    void fetchListings()
      .then((rows) => {
        if (active && revision === listingRevision.current) setListings(rows);
      })
      .catch((error: unknown) => {
        if (active && revision === listingRevision.current)
          setListingError(
            error instanceof Error
              ? error.message
              : 'We couldn’t load the listings.',
          );
      })
      .finally(() => {
        if (active) setListingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshVersion]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    const generation = accountRef.current.generation;
    const revision = accountRevision.current;
    setAccountLoading(true);
    setAccountError('');
    void fetchAccountData(userId)
      .then((data) => {
        if (
          active &&
          generation === accountRef.current.generation &&
          revision === accountRevision.current
        ) {
          setSaved(data.saved);
          setBookings(data.bookings);
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          generation === accountRef.current.generation &&
          revision === accountRevision.current
        )
          setAccountError(
            error instanceof Error
              ? error.message
              : 'We couldn’t load your account.',
          );
      })
      .finally(() => {
        if (active && generation === accountRef.current.generation)
          setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, refreshVersion]);

  const refresh = useCallback(
    () => setRefreshVersion((value) => value + 1),
    [],
  );
  useEffect(() => {
    if (!cloudEnabled) return;
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  function account() {
    const current = accountRef.current;
    if (!current.id || !session) throw new Error('Please sign in to continue.');
    if (accountLoading || !authReady || accountError)
      throw new Error('Please wait for your account to load, or use Retry.');
    return { ...current };
  }

  function stillCurrent(current: { id: string | null; generation: number }) {
    if (
      !mounted.current ||
      current.generation !== accountRef.current.generation
    )
      throw new Error('Your account changed. Please sign in and try again.');
  }

  async function toggleSave(id: string) {
    if (!cloudEnabled) {
      setDemoSaved((previous) =>
        previous.includes(id)
          ? previous.filter((value) => value !== id)
          : [...previous, id],
      );
      return;
    }
    const current = account();
    const requestKey = `${current.generation}:${id}`;
    if (favoriteRequests.current.has(requestKey)) return;
    favoriteRequests.current.add(requestKey);
    const nextSaved = !saved.includes(id);
    try {
      await saveFavourite(current.id!, id, nextSaved);
      stillCurrent(current);
      accountRevision.current += 1;
      setSaved((previous) =>
        nextSaved
          ? [...new Set([...previous, id])]
          : previous.filter((value) => value !== id),
      );
    } finally {
      favoriteRequests.current.delete(requestKey);
    }
  }

  async function createListing(listing: Listing) {
    if (!cloudEnabled) {
      setDemoLocalListings((previous) => [listing, ...previous]);
      return;
    }
    const current = account();
    const result = await publishListing(listing);
    stillCurrent(current);
    listingRevision.current += 1;
    setListings((previous) => [
      result,
      ...previous.filter((row) => row.id !== result.id),
    ]);
  }

  async function createBooking(
    booking: Booking,
    serviceId: string,
  ): Promise<Booking> {
    if (!cloudEnabled) {
      setDemoBookings((previous) => [booking, ...previous]);
      return booking;
    }
    const current = account();
    const result = await reserveBooking(booking, serviceId);
    stillCurrent(current);
    accountRevision.current += 1;
    setBookings((previous) => [
      result,
      ...previous.filter((row) => row.id !== result.id),
    ]);
    return result;
  }

  async function cancelBooking(id: string) {
    if (!cloudEnabled) {
      setDemoBookings((previous) =>
        previous.map((row) =>
          row.id === id ? { ...row, status: 'cancelled' } : row,
        ),
      );
      return;
    }
    const current = account();
    const result = await cancelReservation(id);
    stillCurrent(current);
    accountRevision.current += 1;
    setBookings((previous) =>
      previous.map((row) => (row.id === id ? result : row)),
    );
  }

  async function sendSignInLink(email: string) {
    if (!supabase)
      throw new Error(backendError || 'The database is not connected.');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    if (error)
      throw new Error(
        'We couldn’t send the sign-in link. Please check the email and try again shortly.',
      );
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('We couldn’t sign you out. Please try again.');
  }

  function clearDemo() {
    if (cloudEnabled) return;
    setDemoSaved([]);
    setDemoBookings([]);
    setDemoLocalListings([]);
  }

  const visibleListings = useMemo(
    () => (cloudEnabled ? listings : [...demoLocalListings, ...demoListings]),
    [listings, demoLocalListings],
  );

  return {
    cloud: cloudEnabled,
    session,
    authReady,
    listings: visibleListings,
    saved: cloudEnabled ? saved : demoSaved,
    bookings: cloudEnabled ? bookings : demoBookings,
    loading:
      cloudEnabled &&
      (listingLoading || !authReady || accountLoading) &&
      !backendError,
    error:
      backendError || authError || listingError || accountError || storageError,
    refresh,
    toggleSave,
    createListing,
    createBooking,
    cancelBooking,
    clearDemo,
    sendSignInLink,
    signOut,
  };
}
