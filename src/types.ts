export interface Booking {
  id: string;
  listingId: string;
  listingName: string;
  listingImage: string;
  city: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  guestName: string;
  guestEmail: string;
  createdAt: string;
  status: 'confirmed' | 'cancelled';
}

export type View = 'explore' | 'saved' | 'appointments' | 'hosting';
