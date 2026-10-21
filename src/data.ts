export type Category =
  | 'All'
  | 'Hair'
  | 'Nails'
  | 'Skin'
  | 'Brows & lashes'
  | 'Massage'
  | 'Makeup';

export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export type Listing = {
  id: string;
  name: string;
  category: Exclude<Category, 'All'>;
  neighborhood: string;
  city: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  tag: string;
  amenities: string[];
  services: Service[];
  professional: { name: string; title: string; avatar: string };
  reviews: {
    id: string;
    name: string;
    date: string;
    rating: number;
    text: string;
  }[];
};

export const categories: Category[] = [
  'All',
  'Hair',
  'Nails',
  'Skin',
  'Brows & lashes',
  'Massage',
  'Makeup',
];

const photo = (name: string) => `/images/${name}.webp`;

// All businesses, professionals, services, and reviews below are fictional demo data.
// Stock photos are illustrative only; the people pictured do not represent the fictional names.
// Photo sources and licenses are preserved in public/images/ASSET-CREDITS.md.
// Prices are displayed in Canadian dollars; durations are in minutes.
export const listings: Listing[] = [
  {
    id: 'muse-hair-house',
    name: 'Muse Hair House',
    category: 'Hair',
    neighborhood: 'Old Strathcona',
    city: 'Edmonton',
    description:
      'Good hair, good company. Our sunlit studio just off Whyte Avenue is a space to settle in, talk through your ideas, and leave feeling like yourself. We specialize in lived-in colour, soft layers, and cuts that work with your natural texture.',
    image: photo('salon-interior'),
    images: [photo('salon-interior'), photo('hair'), photo('hair-wash')],
    rating: 4.98,
    reviewCount: 128,
    tag: 'Guest favourite',
    amenities: [
      'Complimentary consultation',
      'Gender-neutral pricing',
      'Free parking',
      'Locally owned',
    ],
    services: [
      {
        id: 'muse-cut',
        name: 'Signature cut & style',
        description:
          'A thoughtful consultation, relaxing wash, tailored cut, and effortless finish.',
        duration: 60,
        price: 75,
      },
      {
        id: 'muse-blowout',
        name: 'Wash & blowout',
        description:
          'Freshly washed hair with a smooth, bouncy finish made to last.',
        duration: 45,
        price: 48,
      },
      {
        id: 'muse-balayage',
        name: 'Lived-in balayage',
        description:
          'Hand-painted dimension, custom toner, and a finishing blowout.',
        duration: 180,
        price: 225,
      },
    ],
    professional: {
      name: 'Claire Martin',
      title: 'Stylist & studio founder',
      avatar: photo('professional-1'),
    },
    reviews: [
      {
        id: 'muse-r1',
        name: 'Sarah K.',
        date: 'October 2026',
        rating: 5,
        text: 'Claire listened to exactly what I wanted and gave me the best low-maintenance cut. Such a welcoming little studio.',
      },
      {
        id: 'muse-r2',
        name: 'Jenna L.',
        date: 'September 2026',
        rating: 5,
        text: 'The colour is so natural, and the whole appointment felt unhurried. Already looking forward to going back.',
      },
    ],
  },
  {
    id: 'the-nail-edit',
    name: 'The Nail Edit',
    category: 'Nails',
    neighborhood: 'Oliver',
    city: 'Edmonton',
    description:
      'A little detail, a big mood. Find your new signature shade at our intimate nail studio in the heart of Oliver. From beautifully simple gel manicures to tiny hand-painted works of art, every set starts with careful nail care.',
    image: photo('nails'),
    images: [photo('nails'), photo('salon-pink'), photo('salon-interior')],
    rating: 4.96,
    reviewCount: 94,
    tag: 'Guest favourite',
    amenities: [
      'Custom nail art',
      'Vegan polish options',
      'Quiet appointments available',
      'Locally owned',
    ],
    services: [
      {
        id: 'edit-gel',
        name: 'Gel manicure',
        description:
          'Shaping, detailed cuticle care, and your choice of glossy gel colour.',
        duration: 50,
        price: 55,
      },
      {
        id: 'edit-art',
        name: 'Gel manicure + nail art',
        description:
          'A fresh gel set with up to four accent nails. Bring your inspiration.',
        duration: 75,
        price: 78,
      },
      {
        id: 'edit-pedi',
        name: 'Slow-down pedicure',
        description:
          'A warm soak, exfoliation, massage, and beautifully polished toes.',
        duration: 60,
        price: 65,
      },
    ],
    professional: {
      name: 'Mia Chen',
      title: 'Nail artist & owner',
      avatar: photo('professional-4'),
    },
    reviews: [
      {
        id: 'edit-r1',
        name: 'Amelia R.',
        date: 'October 2026',
        rating: 5,
        text: 'My little floral design came out even prettier than the reference. The attention to detail is incredible.',
      },
      {
        id: 'edit-r2',
        name: 'Priya S.',
        date: 'September 2026',
        rating: 5,
        text: 'Loved being able to book a quiet appointment. My nails still looked perfect two weeks later.',
      },
    ],
  },
  {
    id: 'ritual-skin-studio',
    name: 'Ritual Skin Studio',
    category: 'Skin',
    neighborhood: 'Kensington',
    city: 'Calgary',
    description:
      'A softer pace for your skin and your day. Our one-on-one facials blend results-minded skincare with restorative facial massage. We take the time to understand your skin before choosing a treatment, with thoughtful options for sensitive skin.',
    image: photo('facial'),
    images: [photo('facial'), photo('salon-pink'), photo('salon-interior')],
    rating: 4.99,
    reviewCount: 76,
    tag: 'Top rated',
    amenities: [
      'Personalized treatments',
      'Fragrance-free options',
      'Private studio',
      'Aftercare guidance',
    ],
    services: [
      {
        id: 'ritual-facial',
        name: 'The signature facial',
        description:
          'A custom cleanse, gentle exfoliation, facial massage, and nourishing mask.',
        duration: 60,
        price: 110,
      },
      {
        id: 'ritual-hydrate',
        name: 'Deep hydration ritual',
        description:
          'A comforting treatment to replenish dry skin and restore a healthy glow.',
        duration: 75,
        price: 140,
      },
      {
        id: 'ritual-express',
        name: 'Lunchtime glow',
        description:
          'A focused facial for a fresh, hydrated complexion when time is short.',
        duration: 30,
        price: 65,
      },
    ],
    professional: {
      name: 'Sophie Williams',
      title: 'Skin therapist & founder',
      avatar: photo('professional-3'),
    },
    reviews: [
      {
        id: 'ritual-r1',
        name: 'Alex T.',
        date: 'October 2026',
        rating: 5,
        text: 'The most relaxing hour of my week. Sophie explained every step and my skin felt so comfortable afterwards.',
      },
      {
        id: 'ritual-r2',
        name: 'Grace M.',
        date: 'September 2026',
        rating: 5,
        text: 'A beautiful calm space and really thoughtful care. The hydration facial was exactly what my skin needed.',
      },
    ],
  },
  {
    id: 'arch-and-aura',
    name: 'Arch & Aura',
    category: 'Brows & lashes',
    neighborhood: '124 Street',
    city: 'Edmonton',
    description:
      'Your features, softly defined. We create natural-looking brows and lashes with careful mapping, a light touch, and a little everyday magic. Come as you are and leave with one less thing to think about in the morning.',
    image: photo('brows'),
    images: [photo('brows'), photo('makeup'), photo('makeup-kit')],
    rating: 4.95,
    reviewCount: 112,
    tag: 'Guest favourite',
    amenities: [
      'Brow mapping included',
      'Natural-looking finishes',
      'Patch tests available',
      'Private appointments',
    ],
    services: [
      {
        id: 'arch-shape',
        name: 'Brow shape & tint',
        description:
          'Custom brow mapping, gentle shaping, and a tint tailored to your colouring.',
        duration: 30,
        price: 42,
      },
      {
        id: 'arch-lift',
        name: 'Lash lift & tint',
        description:
          'Lift and define your natural lashes for an effortlessly open-eyed look.',
        duration: 60,
        price: 90,
      },
      {
        id: 'arch-laminate',
        name: 'Brow lamination',
        description:
          'Softly styled, fuller-looking brows with shaping and a conditioning finish.',
        duration: 50,
        price: 78,
      },
    ],
    professional: {
      name: 'Leila Hassan',
      title: 'Brow & lash artist',
      avatar: photo('professional-4'),
    },
    reviews: [
      {
        id: 'arch-r1',
        name: 'Danielle P.',
        date: 'October 2026',
        rating: 5,
        text: 'My brows finally look like sisters! Leila really takes her time with the shape and makes everything feel easy.',
      },
      {
        id: 'arch-r2',
        name: 'Chloe B.',
        date: 'September 2026',
        rating: 5,
        text: 'My first lash lift and I am so happy with the result. Subtle, pretty, and the appointment was so relaxing.',
      },
    ],
  },
  {
    id: 'still-massage',
    name: 'Still Massage & Wellness',
    category: 'Massage',
    neighborhood: 'Beltline',
    city: 'Calgary',
    description:
      'Room to pause in the middle of the city. Our cozy treatment rooms and considered approach help you unwind, reset, and ease everyday tension. Every session begins with a conversation about how you are feeling and what you need.',
    image: photo('salon-pink'),
    images: [photo('salon-pink'), photo('salon-interior'), photo('facial')],
    rating: 4.97,
    reviewCount: 143,
    tag: 'Top rated',
    amenities: [
      'Registered massage therapists',
      'Heated treatment tables',
      'Accessible entrance',
      'Quiet space',
    ],
    services: [
      {
        id: 'still-relax',
        name: 'Relaxation massage',
        description:
          'A flowing full-body treatment to help you slow down and release tension.',
        duration: 60,
        price: 105,
      },
      {
        id: 'still-deep',
        name: 'Therapeutic massage',
        description:
          'Focused treatment with pressure and techniques tailored to your comfort.',
        duration: 60,
        price: 115,
      },
      {
        id: 'still-reset',
        name: 'The full reset',
        description:
          'An extended session with extra time for the areas that need attention.',
        duration: 90,
        price: 155,
      },
    ],
    professional: {
      name: 'Noah Brooks',
      title: 'Registered massage therapist',
      avatar: photo('professional-2'),
    },
    reviews: [
      {
        id: 'still-r1',
        name: 'Morgan H.',
        date: 'October 2026',
        rating: 5,
        text: 'Noah checked in about pressure throughout and I left feeling so much lighter. A lovely space to switch off.',
      },
      {
        id: 'still-r2',
        name: 'Taylor W.',
        date: 'September 2026',
        rating: 5,
        text: 'The full reset was worth every minute. Warm, comfortable, and completely unhurried.',
      },
    ],
  },
  {
    id: 'sunday-beauty-room',
    name: 'Sunday Beauty Room',
    category: 'Makeup',
    neighborhood: 'Ritchie',
    city: 'Edmonton',
    description:
      'Makeup that still feels like you. Whether you have a celebration on the calendar or want a fresh approach to your everyday routine, our private beauty room is all about luminous skin, thoughtful details, and feeling completely comfortable.',
    image: photo('makeup'),
    images: [photo('makeup'), photo('makeup-kit'), photo('makeup-kit')],
    rating: 4.94,
    reviewCount: 58,
    tag: 'Hidden gem',
    amenities: [
      'Inclusive shade range',
      'Lashes available',
      'Private appointments',
      'Makeup lessons',
    ],
    services: [
      {
        id: 'sunday-soft',
        name: 'Soft glam makeup',
        description:
          'Fresh skin, softly defined eyes, and a polished finish for your occasion.',
        duration: 60,
        price: 95,
      },
      {
        id: 'sunday-event',
        name: 'Full occasion makeup',
        description:
          'A complete, camera-ready look with extra detail and optional strip lashes.',
        duration: 90,
        price: 135,
      },
      {
        id: 'sunday-lesson',
        name: 'Your everyday makeup lesson',
        description:
          'Hands-on guidance to build a simple routine using products you love.',
        duration: 90,
        price: 145,
      },
    ],
    professional: {
      name: 'Isabella Rossi',
      title: 'Makeup artist & educator',
      avatar: photo('professional-1'),
    },
    reviews: [
      {
        id: 'sunday-r1',
        name: 'Emily F.',
        date: 'October 2026',
        rating: 5,
        text: 'I felt like myself, just a little more polished. My makeup stayed lovely through a whole evening of dancing.',
      },
      {
        id: 'sunday-r2',
        name: 'Nadia A.',
        date: 'September 2026',
        rating: 5,
        text: 'The lesson was so practical. Isabella made the steps easy and helped me get more out of products I already own.',
      },
    ],
  },
  {
    id: 'forma-hair-studio',
    name: 'Forma Hair Studio',
    category: 'Hair',
    neighborhood: 'Inglewood',
    city: 'Calgary',
    description:
      'A creative neighbourhood salon for hair with a little personality. We work with all textures and love helping you find a shape that feels right. Expect good conversation, a considered consultation, and a style you can actually recreate at home.',
    image: photo('hair'),
    images: [photo('hair'), photo('hair-wash'), photo('salon-interior')],
    rating: 4.92,
    reviewCount: 87,
    tag: 'Neighbourhood favourite',
    amenities: [
      'All textures welcome',
      'Gender-neutral pricing',
      'Complimentary drinks',
      'Bike parking',
    ],
    services: [
      {
        id: 'forma-cut',
        name: 'Cut, wash & finish',
        description:
          'A custom cut for your texture and routine, with a wash and styled finish.',
        duration: 60,
        price: 68,
      },
      {
        id: 'forma-curl',
        name: 'Curl-by-curl cut',
        description:
          'A dry shaping session, gentle cleanse, and curl styling with homecare tips.',
        duration: 90,
        price: 110,
      },
      {
        id: 'forma-gloss',
        name: 'Colour gloss & style',
        description:
          'Refresh your tone, add shine, and finish with a beautiful blowout.',
        duration: 75,
        price: 98,
      },
    ],
    professional: {
      name: 'Jamie Park',
      title: 'Creative stylist',
      avatar: photo('professional-2'),
    },
    reviews: [
      {
        id: 'forma-r1',
        name: 'Casey N.',
        date: 'October 2026',
        rating: 5,
        text: 'Finally found someone who understands my curls. Jamie gave me great tips without making it complicated.',
      },
      {
        id: 'forma-r2',
        name: 'Riley D.',
        date: 'September 2026',
        rating: 5,
        text: 'Friendly team, great music, and a cut that grows out beautifully. Love having this spot in the neighbourhood.',
      },
    ],
  },
  {
    id: 'alpine-glow',
    name: 'Alpine Glow Studio',
    category: 'Skin',
    neighborhood: 'Downtown',
    city: 'Canmore',
    description:
      'Fresh mountain air meets thoughtful skincare. Tucked just off Main Street, our quiet studio offers a little restorative time for locals and visitors alike. Settle in for nurturing facials made for skin that spends time outdoors.',
    image: photo('facial'),
    images: [photo('facial'), photo('salon-pink'), photo('salon-interior')],
    rating: 4.98,
    reviewCount: 64,
    tag: 'Worth the trip',
    amenities: [
      'Mountain-town retreat',
      'Sensitive skin options',
      'Private studio',
      'Complimentary herbal tea',
    ],
    services: [
      {
        id: 'alpine-restore',
        name: 'Mountain restore facial',
        description:
          'Deep hydration and a gentle facial massage for weather-exposed skin.',
        duration: 60,
        price: 120,
      },
      {
        id: 'alpine-calm',
        name: 'Calm & comfort facial',
        description:
          'A soothing, fragrance-free treatment tailored to sensitive skin.',
        duration: 60,
        price: 115,
      },
      {
        id: 'alpine-mini',
        name: 'Après-adventure refresh',
        description:
          'A quick cleanse, replenishing mask, and nourishing finishing care.',
        duration: 30,
        price: 70,
      },
    ],
    professional: {
      name: 'Emma Reid',
      title: 'Esthetician & owner',
      avatar: photo('professional-4'),
    },
    reviews: [
      {
        id: 'alpine-r1',
        name: 'Olivia J.',
        date: 'October 2026',
        rating: 5,
        text: 'The perfect little treat after a weekend in the mountains. My dry skin felt so much better.',
      },
      {
        id: 'alpine-r2',
        name: 'Avery C.',
        date: 'September 2026',
        rating: 5,
        text: 'Emma created such a calm atmosphere. The tea, the warm bed, the facial — every detail was lovely.',
      },
    ],
  },
  {
    id: 'bare-and-polished',
    name: 'Bare & Polished',
    category: 'Nails',
    neighborhood: 'Glenora',
    city: 'Edmonton',
    description:
      'Understated nails, beautifully done. Our small studio celebrates healthy natural nails, sheer shades, and the kind of thoughtful care that makes an ordinary afternoon feel special. Pick a colour, put your phone away, and enjoy a little you-time.',
    image: photo('nails'),
    images: [photo('nails'), photo('salon-pink'), photo('salon-interior')],
    rating: 4.93,
    reviewCount: 81,
    tag: 'Little luxury',
    amenities: [
      'Natural nail specialists',
      'Vegan polish options',
      'Free parking',
      'One-on-one appointments',
    ],
    services: [
      {
        id: 'bare-classic',
        name: 'The classic manicure',
        description:
          'Nail shaping, careful cuticle work, hand massage, and your chosen polish.',
        duration: 40,
        price: 38,
      },
      {
        id: 'bare-builder',
        name: 'Builder gel manicure',
        description:
          'A strengthening gel overlay with a sheer or solid colour finish.',
        duration: 75,
        price: 72,
      },
      {
        id: 'bare-pedi',
        name: 'The essential pedicure',
        description:
          'A warm soak, foot care, massage, and a beautifully simple polish.',
        duration: 50,
        price: 58,
      },
    ],
    professional: {
      name: 'Ava Thompson',
      title: 'Natural nail specialist',
      avatar: photo('professional-3'),
    },
    reviews: [
      {
        id: 'bare-r1',
        name: 'Hannah E.',
        date: 'October 2026',
        rating: 5,
        text: 'Exactly the clean, simple manicure I wanted. Ava is so gentle and my natural nails have never looked better.',
      },
      {
        id: 'bare-r2',
        name: 'Paige V.',
        date: 'September 2026',
        rating: 5,
        text: 'A little neighbourhood gem. The builder gel is lightweight and has helped me grow my nails out.',
      },
    ],
  },
];
