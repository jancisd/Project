import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Droplets,
  Eye,
  Flower2,
  Grid2X2,
  Hand,
  Heart,
  List,
  Map as MapIcon,
  MapPin,
  Menu,
  Paintbrush,
  Search,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { categories } from './data';
import type { Category, Listing } from './data';
import type { View } from './types';
import BookingDialog from './BookingDialog';
import PartnerDialog from './PartnerDialog';
import ListingDetails from './ListingDetails';
import { getListingCoordinates } from './geography';
import { fetchAvailability } from './backend';
import useMarketplace from './useMarketplace';
import AccountDialog from './AccountDialog';

const cities = ['Edmonton', 'Calgary', 'Canmore'];
const DiscoverMap = lazy(() => import('./DiscoverMap'));
type MapArea = { north: number; south: number; east: number; west: number };
const categoryIcons: Record<Category, typeof Scissors> = {
  All: Grid2X2,
  Hair: Scissors,
  Nails: Hand,
  Skin: Droplets,
  'Brows & lashes': Eye,
  Massage: Flower2,
  Makeup: Paintbrush,
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? 'brand-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <BloomIcon />
      </span>
      airstethics<span className="brand-period">.</span>
    </span>
  );
}

function BloomIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M24 5v38M5 24h38M10.5 10.5l27 27M10.5 37.5l27-27" />
    </svg>
  );
}

function Dialog({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`small-dialog ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const box = ref.current.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function ListingCard({
  listing,
  saved,
  onSave,
  onOpen,
  onLocate,
  onHighlight,
  highlighted = false,
}: {
  listing: Listing;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  onLocate?: () => void;
  onHighlight?: (active: boolean) => void;
  highlighted?: boolean;
}) {
  const price = Math.min(...listing.services.map((s) => s.price));
  return (
    <article
      className={`listing-card${highlighted ? ' listing-card-highlighted' : ''}`}
      data-testid="listing-card"
      data-listing-id={listing.id}
      data-starting-price={price}
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest(
            'button, a, input, select, textarea, [role="button"]',
          )
        )
          onOpen();
      }}
      onMouseEnter={() => onHighlight?.(true)}
      onMouseLeave={() => onHighlight?.(false)}
      onFocus={() => onHighlight?.(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          onHighlight?.(false);
      }}
    >
      <div className="listing-image-wrap">
        <button
          className="listing-image-button"
          onClick={onOpen}
          aria-label={`View ${listing.name}`}
          data-listing-action="view"
        >
          <img
            className="listing-image"
            src={listing.image}
            alt={`${listing.name}, ${listing.category.toLowerCase()} studio in ${listing.city}`}
            loading="lazy"
          />
        </button>
        <span className="listing-tag">{listing.tag}</span>
        <button
          className={`save-button ${saved ? 'is-saved' : ''}`}
          aria-label={`${saved ? 'Unsave' : 'Save'} ${listing.name}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="listing-location">
        <span>
          {listing.category} <span className="tiny-dot">·</span> {listing.city}
        </span>
        <span className="listing-rating">
          {listing.reviewCount > 0 ? (
            <>
              <Star size={12} fill="currentColor" /> {listing.rating.toFixed(2)}{' '}
              <span>({listing.reviewCount})</span>
            </>
          ) : (
            'New'
          )}
        </span>
      </div>
      <h3>
        <button onClick={onOpen} data-listing-action="title">
          {listing.name}
        </button>
      </h3>
      <div className="listing-address">
        <p className="listing-neighborhood">{listing.neighborhood}</p>
        {onLocate && (
          <button
            className="listing-locate"
            onClick={onLocate}
            aria-label={`Locate ${listing.name} on map`}
          >
            <MapPin size={12} />
            <span>On map</span>
          </button>
        )}
      </div>
      <div className="listing-bottom">
        <p>
          From <strong>${price}</strong> <span>CAD / service</span>
        </p>
        <button
          className="card-arrow"
          aria-label={`Explore ${listing.name}`}
          data-listing-action="explore"
          onClick={onOpen}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="primary-button" onClick={onAction}>
        {action}
        <ArrowRight size={17} />
      </button>
    </div>
  );
}

function App() {
  const marketplace = useMarketplace();
  const {
    cloud,
    session,
    authReady,
    listings: allListings,
    saved,
    bookings,
  } = marketplace;
  const [accountOpen, setAccountOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [view, setView] = useState<View>('explore');
  const [category, setCategory] = useState<Category>('All');
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ location: '', query: '' });
  const [sort, setSort] = useState('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(300);
  const [highlyRated, setHighlyRated] = useState(false);
  const [draftPrice, setDraftPrice] = useState(300);
  const [draftRating, setDraftRating] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [info, setInfo] = useState<'about' | 'privacy' | null>(null);
  const [toast, setToast] = useState('');
  const [mapVisible, setMapVisible] = useState(
    () => window.matchMedia('(min-width: 901px)').matches,
  );
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mapArea, setMapArea] = useState<MapArea | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const discoveryLayoutRef = useRef<HTMLDivElement>(null);
  const detailsReturnRef = useRef({
    view: 'explore' as View,
    mapVisible: false,
    scrollY: 0,
    listingId: '',
    action: 'view',
  });
  const restoreDetailsFocus = useRef(false);

  useEffect(() => {
    if (
      detailsId ||
      !restoreDetailsFocus.current ||
      view !== detailsReturnRef.current.view
    )
      return;
    const frame = requestAnimationFrame(() => {
      const context = detailsReturnRef.current;
      const card = document.querySelector(
        `[data-testid="listing-card"][data-listing-id="${CSS.escape(context.listingId)}"]`,
      );
      const target =
        card?.querySelector<HTMLButtonElement>(
          `[data-listing-action="${context.action}"]`,
        ) ?? document.querySelector<HTMLButtonElement>('main button');
      window.scrollTo({ top: context.scrollY, behavior: 'instant' });
      target?.focus({ preventScroll: true });
      restoreDetailsFocus.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [detailsId, view, mapVisible]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    setSelected(null);
    setPartnerOpen(false);
    setCancelId(null);
    setCancelError('');
  }, [session?.user.id]);
  const detailsListing = allListings.find(
    (listing) => listing.id === detailsId,
  );
  const matchingListings = useMemo(() => {
    let items = allListings.filter((listing) => {
      if (view === 'saved') return saved.includes(listing.id);
      const text = [
        listing.name,
        listing.category,
        listing.city,
        listing.neighborhood,
        listing.description,
        ...listing.services.map((s) => s.name),
      ]
        .join(' ')
        .toLowerCase();
      return (
        (category === 'All' || category === listing.category) &&
        (!search.location || listing.city === search.location) &&
        (!search.query || text.includes(search.query.toLowerCase().trim())) &&
        (maxPrice === 300 ||
          Math.min(...listing.services.map((s) => s.price)) <= maxPrice) &&
        (!highlyRated || listing.rating >= 4.9)
      );
    });
    if (sort === 'low')
      items = [...items].sort(
        (a, b) =>
          Math.min(...a.services.map((s) => s.price)) -
          Math.min(...b.services.map((s) => s.price)),
      );
    if (sort === 'high')
      items = [...items].sort(
        (a, b) =>
          Math.min(...b.services.map((s) => s.price)) -
          Math.min(...a.services.map((s) => s.price)),
      );
    if (sort === 'rating')
      items = [...items].sort((a, b) => b.rating - a.rating);
    return items;
  }, [allListings, category, search, maxPrice, highlyRated, sort, view, saved]);
  const mapListings = useMemo(
    () =>
      detailsListing &&
      !matchingListings.some((listing) => listing.id === detailsListing.id)
        ? [...matchingListings, detailsListing]
        : matchingListings,
    [matchingListings, detailsListing],
  );
  const visibleListings = useMemo(() => {
    if (view !== 'explore' || !mapArea) return matchingListings;
    const span = mapArea.east - mapArea.west;
    return matchingListings.filter((listing) => {
      const coordinates = getListingCoordinates(listing);
      if (
        !coordinates ||
        coordinates.lat < mapArea.south ||
        coordinates.lat > mapArea.north
      )
        return false;
      const delta = (((coordinates.lng - mapArea.west) % 360) + 360) % 360;
      return span >= 360 || delta <= ((span % 360) + 360) % 360;
    });
  }, [matchingListings, mapArea, view]);
  const activeFilters = Number(maxPrice < 300) + Number(highlyRated);
  const hasSearch =
    category !== 'All' ||
    search.location ||
    search.query ||
    activeFilters ||
    mapArea;
  const confirmedCount = bookings.filter(
    (b) => b.status === 'confirmed',
  ).length;

  const goTo = (next: View) => {
    setDetailsId(null);
    setMapSelectedId(null);
    restoreDetailsFocus.current = false;
    setView(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const clearFilters = () => {
    setDetailsId(null);
    setCategory('All');
    setQuery('');
    setLocation('');
    setSearch({ location: '', query: '' });
    setMaxPrice(300);
    setHighlyRated(false);
    setSort('recommended');
    setMapArea(null);
    setMapSelectedId(null);
    setHighlightedId(null);
  };
  const needsAccount = () => {
    if (!cloud || (authReady && session)) return false;
    setAccountOpen(true);
    return true;
  };
  const openPartner = () => {
    if (!needsAccount()) setPartnerOpen(true);
  };
  const openBooking = (listing: Listing) => {
    if (!needsAccount()) setSelected(listing);
  };
  const toggleSave = async (id: string) => {
    if (needsAccount()) return;
    const wasSaved = saved.includes(id);
    try {
      await marketplace.toggleSave(id);
      setToast(
        wasSaved
          ? 'Removed from your favourites'
          : 'A little beauty, saved for later',
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : 'We couldn’t update your saved places.',
      );
    }
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch({ location, query: query.trim() });
    setMapArea(null);
    setMapSelectedId(null);
    setDetailsId(null);
    setView('explore');
    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      30,
    );
  };

  const openMap = (listing?: Listing) => {
    setMapVisible(true);
    if (listing) setMapSelectedId(listing.id);
    if (window.matchMedia('(max-width: 900px)').matches) {
      setTimeout(
        () =>
          mapRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        50,
      );
    }
  };

  const openListingDetails = (listing: Listing) => {
    if (!detailsId) {
      const action = document.activeElement?.getAttribute(
        'data-listing-action',
      );
      detailsReturnRef.current = {
        view,
        mapVisible,
        scrollY: window.scrollY,
        listingId: listing.id,
        action: action === 'title' || action === 'explore' ? action : 'view',
      };
    }
    restoreDetailsFocus.current = false;
    setView('explore');
    setMapVisible(true);
    setMapSelectedId(listing.id);
    setDetailsId(listing.id);
    setHighlightedId(null);
    requestAnimationFrame(() =>
      discoveryLayoutRef.current?.scrollIntoView({
        behavior: 'instant',
        block: 'start',
      }),
    );
  };

  const closeListingDetails = () => {
    restoreDetailsFocus.current = true;
    setDetailsId(null);
    setMapSelectedId(null);
    setHighlightedId(null);
    setView(detailsReturnRef.current.view);
    setMapVisible(detailsReturnRef.current.mapVisible);
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand-button"
            onClick={() => goTo('explore')}
            aria-label="airstethics home"
          >
            <Brand />
          </button>
          <nav
            className={`main-nav ${mobileMenu ? 'menu-open' : ''}`}
            aria-label="Main navigation"
          >
            <button
              className={view === 'explore' ? 'nav-active' : ''}
              onClick={() => goTo('explore')}
            >
              Discover
              <span className="nav-dot" />
            </button>
            <button
              className={view === 'saved' ? 'nav-active' : ''}
              onClick={() => goTo('saved')}
            >
              <Heart size={16} />
              Saved
              {saved.length > 0 && (
                <span className="nav-count">{saved.length}</span>
              )}
              <span className="nav-dot" />
            </button>
            <button
              className={view === 'appointments' ? 'nav-active' : ''}
              onClick={() => goTo('appointments')}
            >
              <CalendarDays size={16} />
              My appointments
              {confirmedCount > 0 && (
                <span className="nav-count">{confirmedCount}</span>
              )}
              <span className="nav-dot" />
            </button>
          </nav>
          <div className="header-actions">
            <button className="partner-button" onClick={openPartner}>
              List your space <ArrowUpRightIcon />
            </button>
            {cloud && (
              <button
                className="account-button"
                onClick={() => setAccountOpen(true)}
              >
                {session ? 'Account' : 'Log in'}
              </button>
            )}
            <button
              className="mobile-menu icon-button"
              aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu((v) => !v)}
            >
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="header-country" aria-label="Canada">
              CA<span>✦</span>
            </span>
          </div>
        </div>
      </header>

      <main id="main-content">
        {marketplace.loading && (
          <div className="connection-notice page-width" role="status">
            Loading your places and appointments…
          </div>
        )}
        {marketplace.error && (
          <div
            className="connection-notice connection-error page-width"
            role="alert"
          >
            <span>{marketplace.error}</span>
            {cloud && (
              <button className="text-button" onClick={marketplace.refresh}>
                Retry
              </button>
            )}
          </div>
        )}
        {view === 'explore' && (
          <>
            <div className="discovery-top page-width">
              <section
                className="discover-intro"
                aria-labelledby="discover-title"
              >
                <span className="eyebrow muted-eyebrow">
                  A LITTLE LOCAL. A WORLD OF BEAUTY.
                </span>
                <h1 id="discover-title">
                  Find your kind of <em>beauty.</em>
                </h1>
                <p>Your next feel-good moment is closer than you think.</p>
              </section>
              <form
                className="search-bar discover-search"
                role="search"
                onSubmit={submitSearch}
              >
                <div className="search-field location-field">
                  <MapPin size={21} />
                  <div>
                    <label htmlFor="location">WHERE</label>
                    <div className="select-wrap">
                      <select
                        id="location"
                        aria-label="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      >
                        <option value="">Anywhere in Alberta</option>
                        {cities.map((city) => (
                          <option key={city}>{city}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
                <span className="search-divider" />
                <div className="search-field query-field">
                  <Sparkles size={21} />
                  <div>
                    <label htmlFor="beauty-search">
                      YOUR NEXT FEEL-GOOD MOMENT
                    </label>
                    <input
                      id="beauty-search"
                      aria-label="Search beauty experiences"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="A haircut, a fresh set, a little glow…"
                      type="search"
                    />
                  </div>
                </div>
                <button className="search-button" type="submit">
                  <Search size={19} />
                  <span>Search</span>
                </button>
              </form>
            </div>
            <div className="discovery-note page-width">
              <span>
                <MapPin size={13} /> Starting in Alberta. Explore from anywhere.
              </span>
              <span>
                <ShieldCheck size={14} /> Independent talent. Clear pricing.
              </span>
            </div>
          </>
        )}

        {view === 'explore' && (
          <section
            className={`discovery-section page-width ${mapVisible ? 'is-map-visible' : 'is-list-only'}${detailsListing ? ' has-listing-details' : ''}`}
            id="experiences"
            aria-label="Discover beauty experiences"
            ref={resultsRef}
          >
            <div className="categories-row">
              <div
                className="category-tabs"
                role="group"
                aria-label="Beauty categories"
              >
                {categories.map((cat) => {
                  const Icon = categoryIcons[cat];
                  return (
                    <button
                      key={cat}
                      className={`category-tab ${category === cat ? 'category-active' : ''}`}
                      aria-pressed={category === cat}
                      onClick={() => {
                        setCategory(cat);
                        setDetailsId(null);
                        setMapSelectedId(null);
                      }}
                    >
                      <Icon size={21} strokeWidth={1.5} />
                      <span>{cat === 'All' ? 'All experiences' : cat}</span>
                    </button>
                  );
                })}
              </div>
              <button
                className={`filter-button ${activeFilters ? 'has-filters' : ''}`}
                aria-label="Filters"
                onClick={() => {
                  setDraftPrice(maxPrice);
                  setDraftRating(highlyRated);
                  setFiltersOpen(true);
                }}
              >
                <SlidersHorizontal size={17} />
                <span>Filters</span>
                {activeFilters > 0 && (
                  <span className="filter-count">{activeFilters}</span>
                )}
              </button>
            </div>
            <div className="results-heading discover-results-heading">
              <div>
                <span className="eyebrow muted-eyebrow">
                  FIND A PLACE THAT FEELS LIKE YOU
                </span>
                <h2>
                  {hasSearch
                    ? 'Your next feel-good find.'
                    : 'Meet your new favourites.'}
                </h2>
                <p>
                  {visibleListings.length}{' '}
                  {visibleListings.length === 1
                    ? 'lovely place'
                    : 'lovely places'}{' '}
                  {mapArea
                    ? 'in this map area'
                    : search.location
                      ? `in ${search.location}`
                      : 'across Alberta'}{' '}
                  <span className="results-divider">·</span>{' '}
                  <span>Sample listings, real possibilities</span>
                </p>
              </div>
              <div className="discovery-view-controls">
                <label className="sort-control">
                  <ArrowDownUp size={15} />
                  <span className="sr-only">Sort experiences</span>
                  <select
                    aria-label="Sort experiences"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                    <option value="rating">Highest rated</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
                <button
                  className="view-toggle"
                  onClick={() => {
                    setDetailsId(null);
                    setMapSelectedId(null);
                    mapVisible ? setMapVisible(false) : openMap();
                  }}
                  aria-pressed={mapVisible}
                >
                  {mapVisible ? <List size={16} /> : <MapIcon size={16} />}
                  {mapVisible ? 'Show list' : 'Show map'}
                </button>
              </div>
            </div>
            {hasSearch ? (
              <div className="active-search">
                <span>
                  {category !== 'All' ? category : 'All beauty'}
                  {search.query ? ` · “${search.query}”` : ''}
                  {maxPrice < 300 ? ` · Up to $${maxPrice}` : ''}
                  {highlyRated ? ' · 4.9+ stars' : ''}
                  {mapArea ? ' · Current map area' : ''}
                </span>
                <button onClick={clearFilters}>
                  Clear filters <X size={13} />
                </button>
              </div>
            ) : null}
            <div className="discovery-layout" ref={discoveryLayoutRef}>
              <div className="discovery-list">
                {detailsListing ? (
                  <ListingDetails
                    listing={detailsListing}
                    saved={saved.includes(detailsListing.id)}
                    onSave={() => toggleSave(detailsListing.id)}
                    onClose={closeListingDetails}
                    onBook={() => openBooking(detailsListing)}
                  />
                ) : (
                  <>
                    {visibleListings.length ? (
                      <div className="listing-grid discovery-listing-grid">
                        {visibleListings.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            saved={saved.includes(listing.id)}
                            onSave={() => toggleSave(listing.id)}
                            onOpen={() => openListingDetails(listing)}
                            onLocate={
                              getListingCoordinates(listing)
                                ? () => openMap(listing)
                                : undefined
                            }
                            highlighted={
                              highlightedId === listing.id ||
                              mapSelectedId === listing.id
                            }
                            onHighlight={(active) =>
                              setHighlightedId(active ? listing.id : null)
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Search size={29} />}
                        title="Your perfect match is still out there."
                        description="Try another service, location, or price range. A little reset can do wonders."
                        action="Clear filters"
                        onAction={clearFilters}
                      />
                    )}
                    <p className="end-of-list">
                      <span />A little local love goes a long way.
                      <Flower2 size={18} />
                      <span />
                    </p>
                  </>
                )}
              </div>
              {mapVisible && (
                <div
                  className="discovery-map-shell"
                  data-testid="discovery-map-shell"
                  ref={mapRef}
                >
                  <Suspense
                    fallback={
                      <div className="map-loading" role="status">
                        <MapIcon size={27} />
                        <p>Finding your little corner of the world…</p>
                      </div>
                    }
                  >
                    <DiscoverMap
                      listings={mapListings}
                      selectedId={mapSelectedId}
                      highlightedId={highlightedId}
                      onSelect={(id) => {
                        setMapSelectedId(id);
                        if (detailsId) setDetailsId(id);
                      }}
                      hideSelectedPreview={Boolean(detailsListing)}
                      onBook={openBooking}
                      onSave={toggleSave}
                      saved={saved}
                      onSearchArea={(bounds) => {
                        setMapArea(bounds);
                        setMapSelectedId(null);
                        setDetailsId(null);
                      }}
                      onClearArea={() => setMapArea(null)}
                      areaActive={Boolean(mapArea)}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </section>
        )}

        {view === 'saved' && (
          <section className="page-width personal-section">
            <button className="back-link" onClick={() => goTo('explore')}>
              <ArrowLeft size={16} />
              Back to discovering
            </button>
            <span className="eyebrow muted-eyebrow">
              FOR A RAINY DAY. OR JUST BECAUSE.
            </span>
            <h1>Your little black book.</h1>
            <p className="page-intro">
              All the lovely places you’re keeping close.
            </p>
            {visibleListings.length ? (
              <div className="listing-grid">
                {visibleListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    saved
                    onSave={() => toggleSave(listing.id)}
                    onOpen={() => openListingDetails(listing)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Heart size={30} />}
                title="A few favourites look good here."
                description="Tap the heart on a place you love. We’ll keep it here for your next little escape."
                action="Discover beauty experiences"
                onAction={() => goTo('explore')}
              />
            )}
          </section>
        )}

        {view === 'appointments' && (
          <section className="page-width personal-section appointments-section">
            <button className="back-link" onClick={() => goTo('explore')}>
              <ArrowLeft size={16} />
              Back to discovering
            </button>
            <span className="eyebrow muted-eyebrow">
              SOMETHING GOOD TO LOOK FORWARD TO
            </span>
            <h1>A little time, just for you.</h1>
            <p className="page-intro">
              Your appointments, all in one happy place.
            </p>
            <div className="demo-notice">
              <Sparkles size={17} />
              <p>
                {cloud
                  ? 'Your appointments are saved to your account. This early release has sample studios and collects no payments.'
                  : 'This is your demo appointment book. No real reservations or payments are made.'}
              </p>
            </div>
            {cloud && !session && (
              <button
                className="primary-button"
                onClick={() => setAccountOpen(true)}
              >
                Log in to see your appointments
              </button>
            )}
            {bookings.length ? (
              <div className="appointments-list">
                {[...bookings]
                  .sort((a, b) => `${b.createdAt}`.localeCompare(a.createdAt))
                  .map((booking) => (
                    <article
                      data-testid="appointment-card"
                      key={booking.id}
                      className={`appointment-card ${booking.status === 'cancelled' ? 'appointment-cancelled' : ''}`}
                    >
                      <img
                        src={booking.listingImage}
                        alt={booking.listingName}
                      />
                      <div className="appointment-info">
                        <span className={`booking-status ${booking.status}`}>
                          <span />
                          {booking.status === 'confirmed'
                            ? 'Confirmed'
                            : 'Cancelled'}
                        </span>
                        <h2>{booking.listingName}</h2>
                        <p>
                          {booking.serviceName} <span>·</span>{' '}
                          {booking.duration} min
                        </p>
                        <div className="appointment-date">
                          <CalendarDays size={16} />
                          {new Intl.DateTimeFormat('en-CA', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }).format(new Date(`${booking.date}T12:00:00`))}{' '}
                          <span>at {formatTime(booking.time)}</span>
                        </div>
                        <p className="appointment-city">
                          <MapPin size={14} />
                          {booking.city}, Alberta
                        </p>
                      </div>
                      <div className="appointment-actions">
                        <strong>
                          ${booking.price}
                          <span> CAD</span>
                        </strong>
                        <small>No payment collected</small>
                        {booking.status === 'confirmed' && (
                          <button onClick={() => setCancelId(booking.id)}>
                            Cancel appointment
                          </button>
                        )}
                        <span className="booking-reference">
                          Ref. {booking.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDays size={30} />}
                title="Your next good day starts here."
                description="A fresh cut, a little pampering, a whole new mood. Find a professional and make some time for yourself."
                action="Find your next appointment"
                onAction={() => goTo('explore')}
              />
            )}
          </section>
        )}

        <section className="partner-banner page-width">
          <div className="partner-art" aria-hidden="true">
            <span>
              <BloomIcon />
            </span>
            <span className="partner-art-small">✧</span>
          </div>
          <div>
            <span className="eyebrow">FOR THE PEOPLE BEHIND THE BEAUTY</span>
            <h2>
              Your talent. Your space.
              <br />
              <em>A whole new audience.</em>
            </h2>
            <p>
              Bring your craft to airstethics. We’ll help your people find you.
            </p>
          </div>
          <button onClick={openPartner}>
            Make yourself at home <ArrowUpRightIcon />
          </button>
        </section>
      </main>

      <footer className="site-footer page-width">
        <div className="footer-main">
          <button
            className="brand-button"
            onClick={() => goTo('explore')}
            aria-label="airstethics home"
          >
            <Brand />
          </button>
          <p>A little local. A little lovely. All you.</p>
          <span className="footer-location">
            <MapPin size={14} />
            Made for Alberta, Canada
          </span>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} airstethics. Your kind of beauty.
          </span>
          <div>
            <button onClick={() => setInfo('about')}>About airstethics</button>
            <button onClick={() => setInfo('privacy')}>
              Privacy & demo info
            </button>
            <span>
              English (CA) <span className="tiny-dot">·</span> $ CAD
            </span>
          </div>
        </div>
      </footer>

      {selected && (
        <BookingDialog
          listing={selected}
          bookings={bookings}
          cloud={cloud}
          loadAvailability={cloud ? fetchAvailability : undefined}
          onClose={() => setSelected(null)}
          onBooked={marketplace.createBooking}
        />
      )}
      {filtersOpen && (
        <Dialog
          title="Make it your kind of beauty"
          onClose={() => setFiltersOpen(false)}
        >
          <p className="dialog-intro">
            A few little details to find your perfect place.
          </p>
          <div className="filter-section">
            <div className="filter-label">
              <label htmlFor="price-range">Starting price</label>
              <strong>
                {draftPrice === 300 ? 'Any price' : `Up to $${draftPrice} CAD`}
              </strong>
            </div>
            <p>Filter by each studio’s most affordable service.</p>
            <input
              id="price-range"
              type="range"
              min="25"
              max="300"
              step="5"
              value={draftPrice}
              onChange={(e) => setDraftPrice(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>$25 CAD</span>
              <span>$300+ CAD</span>
            </div>
          </div>
          <label className="checkbox-option">
            <div>
              <strong>Only the well-loved</strong>
              <span>Studios rated 4.9 stars and above</span>
            </div>
            <input
              type="checkbox"
              checked={draftRating}
              onChange={(e) => setDraftRating(e.target.checked)}
            />
          </label>
          <div className="dialog-footer">
            <button
              className="text-button"
              onClick={() => {
                setDraftPrice(300);
                setDraftRating(false);
              }}
            >
              Reset
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setMaxPrice(draftPrice);
                setHighlyRated(draftRating);
                setDetailsId(null);
                setMapSelectedId(null);
                setFiltersOpen(false);
              }}
            >
              Show experiences <ArrowRight size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {partnerOpen && (
        <PartnerDialog
          cloud={cloud}
          onClose={() => setPartnerOpen(false)}
          onCreate={async (listing, photos) => {
            await marketplace.createListing(listing, photos);
            clearFilters();
            setView('explore');
            setPartnerOpen(false);
            setToast(
              cloud
                ? 'Your space is published and ready to discover'
                : 'Your demo space is ready to discover',
            );
            setTimeout(
              () => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }),
              100,
            );
          }}
        />
      )}
      {cancelId && (
        <Dialog title="A change of plans?" onClose={() => setCancelId(null)}>
          <p className="dialog-intro">
            Cancel this {cloud ? '' : 'demo '}appointment? You can always make a
            little time for yourself later.
          </p>
          {cancelError && (
            <p className="booking-error" role="alert">
              {cancelError}
            </p>
          )}
          <div className="dialog-footer">
            <button
              className="text-button"
              disabled={cancelPending}
              onClick={() => {
                setCancelId(null);
                setCancelError('');
              }}
            >
              Keep appointment
            </button>
            <button
              className="primary-button"
              disabled={cancelPending}
              onClick={async () => {
                if (cancelPending) return;
                setCancelPending(true);
                setCancelError('');
                try {
                  await marketplace.cancelBooking(cancelId);
                  setCancelId(null);
                  setToast('Your appointment has been cancelled');
                } catch (error) {
                  setCancelError(
                    error instanceof Error
                      ? error.message
                      : 'We couldn’t cancel your appointment.',
                  );
                } finally {
                  setCancelPending(false);
                }
              }}
            >
              {cancelPending ? 'Cancelling…' : 'Yes, cancel appointment'}
            </button>
          </div>
        </Dialog>
      )}
      {info && (
        <Dialog
          title={
            info === 'about'
              ? 'A little more about airstethics.'
              : 'Your privacy, simply.'
          }
          onClose={() => setInfo(null)}
        >
          {info === 'about' ? (
            <div className="info-copy">
              <p>
                We’re building a place for Alberta’s independent beauty
                community. Hair, nails, skin, brows, and all the little things
                that make you feel like yourself.
              </p>
              <p>
                Explore sample studios in Edmonton, Calgary, and Canmore, save
                your favourites, and try booking a little time for you.
              </p>
              <div className="demo-notice">
                <Sparkles size={18} />
                <p>
                  This is an early prototype. All businesses, reviews, ratings,
                  and availability are fictional. No providers will be
                  contacted, and no payment is collected.
                </p>
              </div>
            </div>
          ) : cloud ? (
            <div className="info-copy">
              <p>
                Listings and listing photos are shared publicly. Your saved
                places, appointment details, name, and email are stored in your
                account and are private to you.
              </p>
              <p>
                This early release does not collect payments or send appointment
                emails. Signing out removes your account information from the
                page. Existing browser demo data is kept separate and is never
                uploaded automatically.
              </p>
              <p>
                To request removal of account data, contact the site owner.
                Signing out does not delete information from the database.
              </p>
            </div>
          ) : (
            <div className="info-copy">
              <p>
                Your favourites, sample listings, and demo bookings are saved
                only in this browser. Booking names and email addresses stay on
                this device; please use sample details.
              </p>
              <p>
                No account, payment system, or live provider connection is
                active. Clearing this site’s browser data removes your saved
                information.
              </p>
              <button
                className="text-button danger-link"
                onClick={() => {
                  marketplace.clearDemo();
                  setInfo(null);
                  setToast('Your saved demo data has been cleared');
                }}
              >
                Clear my demo data
              </button>
            </div>
          )}
        </Dialog>
      )}
      {accountOpen && (
        <AccountDialog
          email={session?.user.email}
          onClose={() => setAccountOpen(false)}
          onSendLink={marketplace.sendSignInLink}
          onSignOut={marketplace.signOut}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

function formatTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

export default App;
