select test_support.assert((
  select count(*) = 1 from public.bookings
  where listing_id = 'muse-hair-house'
    and booking_date = (now() at time zone 'America/Edmonton')::date+2
    and status = 'confirmed'
), 'one simultaneous request wins and the other cannot double-book');
