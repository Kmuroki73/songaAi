import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'driver' | 'passenger';
  full_name: string;
  phone: string;
  created_at: string;
};

export type Vehicle = {
  id: string;
  driver_id: string;
  vehicle_type: '10_seater' | '14_seater' | null;
  vehicle_category: 'carpool' | 'cargo' | 'corporate' | 'sacco' | 'airport_transfer';
  seat_count: number;
  route_from: string;
  route_to: string;
  price_per_seat: number;
  photos: string[];
  is_live: boolean;
  departure_time: string;
  total_rides: number;
  registration_number: string;
  sacco: string;
  expires_at: string;
  status: 'pending' | 'traveling' | 'completed' | 'canceled';
  driver_lat: number | null;
  driver_lng: number | null;
  driver_location_updated_at: string | null;
  central_location: string | null;
  central_lat: number | null;
  central_lng: number | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  vehicle_id: string;
  passenger_id: string;
  seat_number: number;
  amount_paid: number;
  mpesa_number: string;
  payment_status: 'pending' | 'completed' | 'failed';
  pickup_location: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  created_at: string;
};

export type Review = {
  id: string;
  vehicle_id: string;
  passenger_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

export const getPassengerSeats = (v: Pick<Vehicle, 'seat_count' | 'vehicle_type'>): number => {
  if (v.seat_count && v.seat_count > 0) return v.seat_count;
  if (v.vehicle_type === '10_seater') return 10;
  return 14;
};

export const PASSENGER_SEATS: Record<string, number> = {
  '14_seater': 14,
  '10_seater': 10,
};
