import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listings as demoListings } from './data';
import type { Listing } from './data';
import type { Booking } from './types';
import { getSignInErrorMessage } from './auth-errors';
import type { AccountMode } from './AccountDialog';
import {
  getAccountSecurity,
  enrollAuthenticator,
  verifyAuthenticator,
  removeAuthenticator,
} from './account-service';
import type { AccountSecurity } from './account-service';
import { demoPhotoSources, uploadListingPhotos } from './photo-upload';
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
  fetchHostDashboard,
  updateHostedListing,
  cancelHostReservation,
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
  const [security, setSecurity] = useState<AccountSecurity | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hostListings, setHostListings] = useState<Listing[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [hostLoaded, setHostLoaded] = useState(false);
  const [hostLoading, setHostLoading] = useState(cloudEnabled);
  const [hostError, setHostError] = useState('');
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
  const photoUploads = useRef(new Map<string, Promise<string[]>>());
  const listingRevision = useRef(0);
  const accountRevision = useRef(0);
  const hostRevision = useRef(0);
  const securityRevision = useRef(0);
  const securityRef = useRef<AccountSecurity | null>(null);
  const accessToken = useRef<string | null>(null);

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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
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
        setHostError('');
        photoUploads.current.clear();
        setRecovery(false);
      }
      if (accessToken.current !== (nextSession?.access_token ?? null)) {
        accessToken.current = nextSession?.access_token ?? null;
        securityRevision.current += 1;
        securityRef.current = null;
        setSecurity(null);
        setSecurityLoading(Boolean(id));
        setSecurityError('');
        setSaved([]);
        setBookings([]);
        setHostListings([]);
        setHostBookings([]);
        setHostLoaded(false);
        setHostLoading(Boolean(id));
      }
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
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

  const refreshSecurity = useCallback(async () => {
    const current = { ...accountRef.current };
    if (!current.id) return;
    const revision = ++securityRevision.current;
    securityRef.current = null;
    setSecurity(null);
    setSecurityLoading(true);
    setSecurityError('');
    setSaved([]);
    setBookings([]);
    setHostListings([]);
    setHostBookings([]);
    setHostLoaded(false);
    setHostLoading(true);
    setHostError('');
    setAccountLoading(false);
    const isCurrent = () =>
      mounted.current &&
      revision === securityRevision.current &&
      current.generation === accountRef.current.generation;
    try {
      const result = await getAccountSecurity();
      if (isCurrent()) {
        securityRef.current = result;
        setSecurity(result);
      }
    } catch (error) {
      if (isCurrent())
        setSecurityError(
          error instanceof Error
            ? error.message
            : 'We couldn’t check your account security. Please try again.',
        );
    } finally {
      if (isCurrent()) setSecurityLoading(false);
    }
  }, []);

  const userId = session?.user.id;
  const sessionToken = session?.access_token;
  useEffect(() => {
    // Auth callbacks stay synchronous; SDK calls here run after its session lock
    // is released. A fresh server check also catches factors changed elsewhere.
    if (userId) void refreshSecurity();
  }, [userId, sessionToken, refreshVersion, refreshSecurity]);

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

  const accountReady =
    !cloudEnabled ||
    Boolean(
      session && security && !security.needsChallenge && !securityLoading,
    );
  useEffect(() => {
    if (!supabase || !userId || !accountReady || !securityRef.current) return;
    let active = true;
    const generation = accountRef.current.generation;
    const revision = accountRevision.current;
    const assuranceRevision = securityRevision.current;
    setAccountLoading(true);
    setAccountError('');
    void fetchAccountData(userId)
      .then((data) => {
        if (
          active &&
          assuranceRevision === securityRevision.current &&
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
          assuranceRevision === securityRevision.current &&
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
        if (
          active &&
          generation === accountRef.current.generation &&
          assuranceRevision === securityRevision.current
        )
          setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, accountReady, security, refreshVersion]);

  useEffect(() => {
    if (!supabase || !userId || !accountReady || !securityRef.current) return;
    let active = true;
    const generation = accountRef.current.generation;
    const assuranceRevision = securityRevision.current;
    const revision = hostRevision.current;
    const isCurrent = () =>
      active &&
      generation === accountRef.current.generation &&
      assuranceRevision === securityRevision.current &&
      revision === hostRevision.current;
    setHostLoading(true);
    setHostError('');
    void fetchHostDashboard()
      .then((data) => {
        if (!isCurrent()) return;
        setHostListings(data.listings);
        setHostBookings(data.bookings);
        setHostLoaded(true);
      })
      .catch((error: unknown) => {
        if (isCurrent())
          setHostError(
            error instanceof Error
              ? error.message
              : 'We couldn’t load your business. Please try again.',
          );
      })
      .finally(() => {
        if (isCurrent()) setHostLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, accountReady, security, refreshVersion]);

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
    if (!securityRef.current)
      throw new Error(
        'Please wait for your account security check, or use Retry.',
      );
    if (securityRef.current.needsChallenge)
      throw new Error(
        'Please verify a code from your authenticator app to continue.',
      );
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
    if (!securityRef.current || securityRef.current.needsChallenge)
      throw new Error('Please verify your account before continuing.');
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

  async function listingPhotoSources(
    current: { id: string | null; generation: number },
    requestId: string,
    photos: File[],
  ) {
    if (!photos.length) return [];
    const key = `${current.generation}:${requestId}`;
    let request = photoUploads.current.get(key);
    if (!request) {
      request = uploadListingPhotos(current.id!, requestId, photos, () =>
        stillCurrent(current),
      );
      photoUploads.current.set(key, request);
      void request.catch(() => {
        if (photoUploads.current.get(key) === request)
          photoUploads.current.delete(key);
      });
    }
    return request;
  }

  async function createListing(
    listing: Listing,
    photos: File[] = [],
    additionalLocation = false,
  ) {
    if (!cloudEnabled) {
      if (demoLocalListings.length && !additionalLocation)
        throw new Error(
          'You already have a space. Open My business to edit it, or choose Add another location.',
        );
      const sources = photos.length ? await demoPhotoSources(photos) : [];
      const saved = sources.length
        ? { ...listing, image: sources[0], images: sources }
        : listing;
      const next = [saved, ...demoLocalListings];
      if (photos.length) {
        try {
          localStorage.setItem('airstethics:listings', JSON.stringify(next));
        } catch {
          throw new Error(
            'Photos couldn’t be saved in this browser. Please try fewer or smaller photos.',
          );
        }
      }
      setDemoLocalListings(next);
      return;
    }
    const current = account();
    if (!hostLoaded || hostLoading || hostError)
      throw new Error('Please load My business before listing your space.');
    const sources = await listingPhotoSources(current, listing.id, photos);
    stillCurrent(current);
    const result = await publishListing(
      sources.length
        ? { ...listing, image: sources[0], images: sources }
        : listing,
      additionalLocation,
    );
    stillCurrent(current);
    listingRevision.current += 1;
    setListings((previous) => [
      result,
      ...previous.filter((row) => row.id !== result.id),
    ]);
    hostRevision.current += 1;
    setHostListings((previous) => [
      result,
      ...previous.filter((row) => row.id !== result.id),
    ]);
    setHostLoading(false);
  }

  async function updateListing(
    listing: Listing,
    photos: File[] = [],
    requestId: string = crypto.randomUUID(),
  ) {
    const owned = cloudEnabled ? hostListings : demoLocalListings;
    if (!owned.some((row) => row.id === listing.id))
      throw new Error(
        'You can only edit a space that belongs to your account.',
      );
    if (listing.images.length + photos.length > 8)
      throw new Error('Keep up to 8 photos per space.');
    const current = cloudEnabled ? account() : null;
    const sources = current
      ? await listingPhotoSources(current, requestId, photos)
      : await demoPhotoSources(photos);
    const images = [...listing.images, ...sources];
    if (!images.length)
      throw new Error('Keep at least one photo or add a new photo.');
    const candidate = { ...listing, images, image: images[0] };
    if (!current) {
      const next = demoLocalListings.map((row) =>
        row.id === listing.id ? candidate : row,
      );
      try {
        localStorage.setItem('airstethics:listings', JSON.stringify(next));
      } catch {
        throw new Error(
          'Your changes couldn’t be saved in this browser. Try fewer or smaller photos.',
        );
      }
      setDemoLocalListings(next);
      return;
    }
    stillCurrent(current);
    const result = await updateHostedListing(candidate);
    stillCurrent(current);
    listingRevision.current += 1;
    hostRevision.current += 1;
    setListings((previous) =>
      previous.map((row) => (row.id === result.id ? result : row)),
    );
    setHostListings((previous) =>
      previous.map((row) => (row.id === result.id ? result : row)),
    );
    setHostLoading(false);
  }

  async function createBooking(
    booking: Booking,
    serviceId: string,
  ): Promise<Booking> {
    if (!cloudEnabled) {
      if (booking.listingImage.startsWith('data:')) {
        try {
          localStorage.setItem(
            'airstethics:bookings',
            JSON.stringify([booking, ...demoBookings]),
          );
        } catch {
          throw new Error(
            'This browser has no room to save the appointment. Clear some demo data and try again.',
          );
        }
      }
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
    if (hostListings.some((listing) => listing.id === result.listingId)) {
      hostRevision.current += 1;
      setHostBookings((previous) => [
        result,
        ...previous.filter((row) => row.id !== result.id),
      ]);
    }
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
    hostRevision.current += 1;
    setHostBookings((previous) =>
      previous.map((row) => (row.id === id ? result : row)),
    );
  }

  async function cancelHostedBooking(id: string) {
    if (!cloudEnabled) {
      if (
        !demoBookings.some(
          (booking) =>
            booking.id === id &&
            demoLocalListings.some(
              (listing) => listing.id === booking.listingId,
            ),
        )
      )
        throw new Error('This appointment does not belong to your business.');
      await cancelBooking(id);
      return;
    }
    const current = account();
    const result = await cancelHostReservation(id);
    stillCurrent(current);
    hostRevision.current += 1;
    accountRevision.current += 1;
    setHostBookings((previous) =>
      previous.map((row) => (row.id === id ? result : row)),
    );
    setBookings((previous) =>
      previous.map((row) => (row.id === id ? result : row)),
    );
  }

  async function sendSignInLink(email: string, mode: AccountMode = 'login') {
    if (!supabase)
      throw new Error(backendError || 'The database is not connected.');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === 'signup',
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    if (error) throw new Error(getSignInErrorMessage(error, mode));
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('We couldn’t sign you out. Please try again.');
  }

  async function startAuthenticator() {
    const result = await enrollAuthenticator();
    return result;
  }

  async function confirmAuthenticator(factorId: string, code: string) {
    await verifyAuthenticator(factorId, code);
    // Verification has succeeded even if this separate security lookup fails.
    // The lookup keeps account data locked until its result is confirmed.
    await refreshSecurity();
  }

  async function deleteAuthenticator(factorId: string) {
    await removeAuthenticator(factorId);
    await refreshSecurity();
  }

  function finishRecovery() {
    setRecovery(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get('account') === 'recovery') {
      url.searchParams.delete('account');
      window.history.replaceState(window.history.state, '', url);
    }
  }

  function clearDemo() {
    if (cloudEnabled) return;
    setDemoSaved([]);
    setDemoBookings([]);
    setDemoLocalListings([]);
  }

  const visibleListings = useMemo(() => {
    if (!cloudEnabled) return [...demoLocalListings, ...demoListings];
    const owned = new Map(hostListings.map((listing) => [listing.id, listing]));
    return [
      ...hostListings.filter(
        (listing) => !listings.some((row) => row.id === listing.id),
      ),
      ...listings.map((listing) => owned.get(listing.id) ?? listing),
    ];
  }, [listings, hostListings, demoLocalListings]);

  return {
    cloud: cloudEnabled,
    session,
    authReady,
    accountReady,
    security,
    securityLoading,
    securityError,
    recovery,
    refreshSecurity,
    startAuthenticator,
    confirmAuthenticator,
    deleteAuthenticator,
    finishRecovery,
    listings: visibleListings,
    saved: cloudEnabled ? saved : demoSaved,
    bookings: cloudEnabled ? bookings : demoBookings,
    hostListings: cloudEnabled ? hostListings : demoLocalListings,
    hostBookings: cloudEnabled
      ? hostBookings
      : demoBookings.filter((booking) =>
          demoLocalListings.some((listing) => listing.id === booking.listingId),
        ),
    hostLoaded: !cloudEnabled || hostLoaded,
    hostLoading: cloudEnabled && hostLoading,
    hostError,
    loading:
      cloudEnabled &&
      (listingLoading || !authReady || securityLoading || accountLoading) &&
      !backendError,
    error:
      backendError ||
      authError ||
      securityError ||
      listingError ||
      accountError ||
      storageError,
    refresh,
    toggleSave,
    createListing,
    updateListing,
    cancelHostedBooking,
    createBooking,
    cancelBooking,
    clearDemo,
    sendSignInLink,
    signOut,
  };
}
