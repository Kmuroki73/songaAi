// Songa AI — intent detection and provider resolution
// API integrations (Amadeus, Uber, Cargo) slot in here without touching the UI layer.

export type TravelIntent =
  | 'songa_ride'
  | 'flight'
  | 'cargo'
  | 'tour'
  | 'food_delivery'
  | 'ride_hailing'
  | 'unknown';

export interface ParsedQuery {
  intent: TravelIntent;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  rawText: string;
}

export interface TravelResult {
  id: string;
  provider: 'Songa' | 'Uber' | 'Bolt' | 'Kenya Airways' | 'Jambojet' | 'Safarilink' | 'Songa Cargo' | 'Generic';
  type: TravelIntent;
  from: string;
  to: string;
  departureTime?: string;
  price: number;
  currency: 'KES' | 'USD';
  availability: 'available' | 'limited' | 'full' | 'pending';
  bookingUrl?: string;
  phone?: string;
  description?: string;
  isSongaPriority?: boolean;
}

// ─── Intent detection ────────────────────────────────────────────────────────

const FLIGHT_KEYWORDS = ['flight', 'fly', 'plane', 'airport', 'airline', 'airways', 'air ticket'];
const CARGO_KEYWORDS = ['cargo', 'parcel', 'package', 'freight', 'goods', 'delivery', 'courier', 'ship'];
const FOOD_KEYWORDS = ['food', 'eat', 'lunch', 'dinner', 'breakfast', 'restaurant', 'meal', 'order food'];
const TOUR_KEYWORDS = ['tour', 'safari', 'holiday', 'vacation', 'trip', 'sightseeing', 'park', 'masai mara', 'amboseli'];
const RIDE_HAILING_KEYWORDS = ['uber', 'bolt', 'taxi', 'cab', 'hail'];

export function detectIntent(text: string): TravelIntent {
  const lower = text.toLowerCase();
  if (FLIGHT_KEYWORDS.some(k => lower.includes(k))) return 'flight';
  if (CARGO_KEYWORDS.some(k => lower.includes(k))) return 'cargo';
  if (FOOD_KEYWORDS.some(k => lower.includes(k))) return 'food_delivery';
  if (TOUR_KEYWORDS.some(k => lower.includes(k))) return 'tour';
  if (RIDE_HAILING_KEYWORDS.some(k => lower.includes(k))) return 'ride_hailing';
  return 'songa_ride';
}

// ─── Location extraction ──────────────────────────────────────────────────────

const KE_PLACES = [
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'meru', 'thika',
  'nyeri', 'kitale', 'malindi', 'lamu', 'garissa', 'isiolo', 'nanyuki',
  'embu', 'machakos', 'voi', 'bungoma', 'kakamega', 'kericho', 'bomet',
  'muranga', 'kirinyaga', 'kiambu', 'kajiado', 'narok', 'migori', 'kisii',
  'homabay', 'siaya', 'busia', 'trans nzoia', 'uasin gishu', 'nandi',
  'baringo', 'laikipia', 'samburu', 'marsabit', 'wajir', 'mandera',
  'tana river', 'kilifi', 'kwale', 'taita taveta', 'makueni', 'kitui',
];

function extractPlaces(text: string): { from?: string; to?: string } {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const place of KE_PLACES) {
    if (lower.includes(place)) found.push(place.charAt(0).toUpperCase() + place.slice(1));
  }
  if (found.length >= 2) return { from: found[0], to: found[1] };
  if (found.length === 1) return { to: found[0] };
  return {};
}

// ─── Date/time extraction ─────────────────────────────────────────────────────

function extractDateTime(text: string): { date?: string; time?: string } {
  const lower = text.toLowerCase();
  let date: string | undefined;
  let time: string | undefined;

  if (lower.includes('today')) date = new Date().toLocaleDateString('en-KE');
  else if (lower.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    date = d.toLocaleDateString('en-KE');
  }

  const timeMatch = lower.match(/(\d{1,2})(:\d{2})?\s*(am|pm)/i);
  if (timeMatch) time = timeMatch[0].toUpperCase();

  const eveningWords = ['tonight', 'evening'];
  if (eveningWords.some(w => lower.includes(w))) {
    if (!date) date = new Date().toLocaleDateString('en-KE');
    if (!time) time = 'Evening';
  }

  return { date, time };
}

// ─── Full query parser ────────────────────────────────────────────────────────

export function parseQuery(text: string): ParsedQuery {
  const intent = detectIntent(text);
  const places = extractPlaces(text);
  const dt = extractDateTime(text);
  return { intent, rawText: text, ...places, ...dt };
}

// ─── Mock results (replaced by real APIs when keys are available) ─────────────

export async function fetchResults(query: ParsedQuery): Promise<TravelResult[]> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1200));

  const from = query.from ?? 'Your location';
  const to = query.to ?? 'Destination';
  const depTime = query.time ?? 'Flexible';

  if (query.intent === 'flight') {
    return [
      {
        id: 'kq-001', provider: 'Kenya Airways', type: 'flight',
        from, to, departureTime: depTime, price: 7800, currency: 'KES',
        availability: 'available', bookingUrl: 'https://www.kenya-airways.com',
        description: 'Economy class · 1h 10m',
      },
      {
        id: 'jj-001', provider: 'Jambojet', type: 'flight',
        from, to, departureTime: depTime, price: 5500, currency: 'KES',
        availability: 'limited', bookingUrl: 'https://www.jambojet.com',
        description: 'Economy class · 1h 05m',
      },
      {
        id: 'sl-001', provider: 'Safarilink', type: 'flight',
        from, to, departureTime: depTime, price: 12000, currency: 'KES',
        availability: 'available', bookingUrl: 'https://www.safarilink.co.ke',
        description: 'Leisure class · Scenic route',
      },
    ];
  }

  if (query.intent === 'cargo') {
    return [
      {
        id: 'sc-001', provider: 'Songa Cargo', type: 'cargo',
        from, to, departureTime: depTime, price: 1200, currency: 'KES',
        availability: 'available', phone: '+254700000000',
        isSongaPriority: true,
        description: 'Same-day dispatch · Up to 50kg',
      },
      {
        id: 'gen-cargo-001', provider: 'Generic', type: 'cargo',
        from, to, departureTime: 'Next day', price: 900, currency: 'KES',
        availability: 'available', phone: '+254711000000',
        description: 'Standard freight · 1-2 days',
      },
    ];
  }

  if (query.intent === 'ride_hailing') {
    return [
      {
        id: 'songa-001', provider: 'Songa', type: 'songa_ride',
        from, to, departureTime: depTime, price: 850, currency: 'KES',
        availability: 'available', phone: '+254700000000',
        isSongaPriority: true,
        description: 'Scheduled matatu · Comfortable',
      },
      {
        id: 'uber-001', provider: 'Uber', type: 'ride_hailing',
        from, to, departureTime: 'On demand', price: 1400, currency: 'KES',
        availability: 'available', bookingUrl: 'https://m.uber.com',
        description: 'UberX · ~25 min away',
      },
      {
        id: 'bolt-001', provider: 'Bolt', type: 'ride_hailing',
        from, to, departureTime: 'On demand', price: 1200, currency: 'KES',
        availability: 'available', bookingUrl: 'https://bolt.eu',
        description: 'Bolt Ride · ~20 min away',
      },
    ];
  }

  if (query.intent === 'tour') {
    return [
      {
        id: 'tour-001', provider: 'Generic', type: 'tour',
        from, to, departureTime: depTime, price: 15000, currency: 'KES',
        availability: 'limited', phone: '+254722000000',
        description: 'Full-day tour · Guide included · Meals',
      },
      {
        id: 'tour-002', provider: 'Songa', type: 'tour',
        from, to, departureTime: depTime, price: 8500, currency: 'KES',
        availability: 'available', phone: '+254700000000',
        isSongaPriority: true,
        description: 'Group shuttle · Park entry extra',
      },
    ];
  }

  if (query.intent === 'food_delivery') {
    return [
      {
        id: 'food-001', provider: 'Generic', type: 'food_delivery',
        from: 'Nearby restaurants', to: 'Your location',
        price: 150, currency: 'KES', availability: 'available',
        phone: '+254700000000',
        description: 'Delivery in 30-45 min',
      },
    ];
  }

  // Default: songa_ride
  return [
    {
      id: 'songa-r-001', provider: 'Songa', type: 'songa_ride',
      from, to, departureTime: depTime, price: 650, currency: 'KES',
      availability: 'available', phone: '+254700000000',
      isSongaPriority: true,
      description: 'Scheduled matatu · 4 seats left',
    },
    {
      id: 'songa-r-002', provider: 'Songa', type: 'songa_ride',
      from, to, departureTime: 'Later departure', price: 700, currency: 'KES',
      availability: 'limited', phone: '+254700000000',
      isSongaPriority: true,
      description: 'Express coach · 2 seats left',
    },
    {
      id: 'uber-r-001', provider: 'Uber', type: 'ride_hailing',
      from, to, departureTime: 'On demand', price: 1600, currency: 'KES',
      availability: 'available', bookingUrl: 'https://m.uber.com',
      description: 'UberX · Door to door',
    },
  ];
}

// ─── AI response generator ────────────────────────────────────────────────────

export function buildAIResponse(query: ParsedQuery, resultCount: number): string {
  const { intent, from, to, date } = query;
  const route = from && to ? `${from} → ${to}` : to ? `to ${to}` : 'for your route';
  const dateStr = date ? ` on ${date}` : '';

  if (resultCount === 0) {
    return `I couldn't find any options ${route}${dateStr} right now. Try adjusting your dates or route and I'll search again.`;
  }

  const intros: Record<TravelIntent, string> = {
    flight: `Here are the best flights ${route}${dateStr}. I've sorted them by price — Jambojet usually offers the best fares on domestic routes.`,
    songa_ride: `Found ${resultCount} options ${route}${dateStr}. Songa rides are shown first — they're the most reliable and affordable on this corridor.`,
    cargo: `Here are cargo options ${route}${dateStr}. Songa Cargo offers same-day dispatch with full tracking.`,
    tour: `Here are tour options ${route}${dateStr}. Group tours via Songa are the most budget-friendly way to go.`,
    food_delivery: `Here are food delivery options near you. Tap to order!`,
    ride_hailing: `Found ${resultCount} ride options ${route}${dateStr}. Songa scheduled rides are cheapest — Uber and Bolt are on-demand alternatives.`,
    unknown: `Found ${resultCount} travel options ${route}${dateStr}. Let me know if you'd like to narrow it down.`,
  };

  return intros[intent] ?? intros.unknown;
}
