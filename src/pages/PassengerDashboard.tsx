import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut, Search, MapPin, Star, User, Phone, Car,
  MessageSquare, History, Navigation, LogIn,
  Clock, ChevronRight, PhoneCall, Sparkles, Zap,
} from 'lucide-react';
import { SongaAI } from './SongaAI';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Vehicle, Profile, Review, Booking, getPassengerSeats } from '../lib/supabase';
import { SeatSelector } from '../components/SeatSelector';
import { ReviewModal } from '../components/ReviewModal';
import { BookingHistory } from '../components/BookingHistory';
import { LocationSearch } from '../components/LocationSearch';
import { Auth } from './Auth';
import { Footer } from '../components/Footer';

type VehicleWithDriver = Vehicle & {
  profiles: Profile;
  reviews: (Review & { profiles: Profile })[];
  bookedCount?: number;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}:${m} ${ampm}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function countdown(dateStr: string) {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs <= 0) return 'Departing now';
  const m = Math.floor(diffMs / 60000);
  if (m < 60) return `Leaves in ${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `Leaves in ${h}h` : `Leaves in ${h}h ${rem}m`;
}

function hasDeparted(dateStr: string) {
  return new Date(dateStr).getTime() < Date.now();
}

function avgRating(reviews: Review[]) {
  if (!reviews.length) return null;
  return (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
}

export const PassengerDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleWithDriver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithDriver | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showPickup, setShowPickup] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [mpesaNumber, setMpesaNumber] = useState(profile?.phone ?? '');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [reviewVehicle, setReviewVehicle] = useState<VehicleWithDriver | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [showBookingHistory, setShowBookingHistory] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSongaAI, setShowSongaAI] = useState(false);
  const [, tick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchVehicles();
    if (user) fetchUserBookings();

    const sub = supabase
      .channel('vehicles-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchVehicles)
      .subscribe();

    tickRef.current = setInterval(() => tick((n) => n + 1), 60000);

    return () => {
      sub.unsubscribe();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (profile?.phone && !mpesaNumber) setMpesaNumber(profile.phone);
  }, [profile]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select(`*, profiles(*), reviews(*, profiles(*))`)
      .eq('is_live', true)
      .in('status', ['pending', 'traveling'])
      .order('departure_time', { ascending: true });

    if (data) {
      const ids = (data as VehicleWithDriver[]).map((v) => v.id);
      const { data: bookingCounts } = await supabase
        .from('bookings')
        .select('vehicle_id')
        .in('vehicle_id', ids)
        .eq('payment_status', 'completed');

      const countMap: Record<string, number> = {};
      if (bookingCounts) {
        bookingCounts.forEach((b) => {
          countMap[b.vehicle_id] = (countMap[b.vehicle_id] ?? 0) + 1;
        });
      }

      setVehicles(
        (data as VehicleWithDriver[]).map((v) => ({ ...v, bookedCount: countMap[v.id] ?? 0 }))
      );
    }
    setLoading(false);
  };

  const fetchUserBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('passenger_id', user.id)
      .eq('payment_status', 'completed');
    if (data) setUserBookings(data);
  };

  const handleBookVehicle = (vehicle: VehicleWithDriver) => {
    if (!user) {
      setSelectedVehicle(vehicle);
      setShowAuth(true);
    } else {
      setSelectedVehicle(vehicle);
    }
  };

  const handleSeatSelect = (seatNumber: number) => {
    setSelectedSeat(seatNumber);
    setShowPickup(true);
  };

  const handleBooking = async () => {
    if (!selectedVehicle || !selectedSeat || !mpesaNumber || !user) return;
    setBookingLoading(true);
    const total = selectedVehicle.price_per_seat + 100;
    const { error } = await supabase.from('bookings').insert({
      vehicle_id: selectedVehicle.id,
      passenger_id: user.id,
      seat_number: selectedSeat,
      amount_paid: total,
      mpesa_number: mpesaNumber,
      payment_status: 'completed',
      pickup_location: pickupLocation,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
    });
    if (!error) {
      await supabase
        .from('vehicles')
        .update({ total_rides: selectedVehicle.total_rides + 1 })
        .eq('id', selectedVehicle.id);
      fetchUserBookings();
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowPayment(false);
        setShowPickup(false);
        setSelectedSeat(null);
        setSelectedVehicle(null);
        setMpesaNumber(profile?.phone ?? '');
        setPickupLocation('');
        setPickupLat(null);
        setPickupLng(null);
      }, 2500);
    } else {
      alert('Booking failed. Seat may already be taken.');
    }
    setBookingLoading(false);
  };

  const filtered = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    return !q || v.route_from.toLowerCase().includes(q) || v.route_to.toLowerCase().includes(q);
  });

  const upcoming = filtered.filter((v) => !hasDeparted(v.departure_time));
  const traveling = filtered.filter((v) => hasDeparted(v.departure_time));

  const TripCard = ({ vehicle, idx, section }: { vehicle: VehicleWithDriver; idx: number; section: 'upcoming' | 'traveling' }) => {
    const rating = avgRating(vehicle.reviews);
    const leavingSoon = !hasDeparted(vehicle.departure_time) &&
      new Date(vehicle.departure_time).getTime() - Date.now() < 30 * 60 * 1000;
    const totalSeats = getPassengerSeats(vehicle);
    const available = totalSeats - (vehicle.bookedCount ?? 0);
    const isTraveling = section === 'traveling';
    const photo = vehicle.photos?.[0];

    return (
      <div className={`bg-white rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-md shadow-sm ${
        idx === 0 && section === 'upcoming'
          ? 'border-[#FF6B00] ring-1 ring-orange-500/20'
          : isTraveling
          ? 'border-blue-300 ring-1 ring-blue-500/10'
          : 'border-gray-200'
      }`}>
        {/* Status banner */}
        {idx === 0 && section === 'upcoming' && (
          <div className="bg-orange-500 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wide uppercase">Next Departure</span>
          </div>
        )}
        {isTraveling && (
          <div className="bg-blue-500 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wide uppercase">En Route</span>
          </div>
        )}

        {photo && (
          <div className="relative h-36 overflow-hidden">
            <img src={photo} alt={vehicle.registration_number} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            {vehicle.registration_number && (
              <span className="absolute bottom-2 left-3 text-white text-xs font-mono font-bold bg-black/50 px-2 py-0.5 rounded">
                {vehicle.registration_number}
              </span>
            )}
            <span className={`absolute bottom-2 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
              available === 0 ? 'bg-red-500 text-white' : available <= 3 ? 'bg-[#FF6B00] text-white' : 'bg-green-500 text-white'
            }`}>
              {available === 0 ? 'Full' : `${available} seat${available !== 1 ? 's' : ''} left`}
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className={`text-4xl sm:text-5xl font-black tracking-tight leading-none mb-1 ${
                leavingSoon ? 'text-[#FF6B00]' : isTraveling ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {formatTime(vehicle.departure_time)}
              </div>
              <div className="text-xs text-gray-500 mb-2">{formatDate(vehicle.departure_time)}</div>

              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
                isTraveling ? 'bg-blue-100 text-blue-700' : leavingSoon ? 'bg-orange-100 text-[#FF6B00]' : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-3 h-3" />
                {isTraveling ? 'Already traveling' : countdown(vehicle.departure_time)}
              </span>

              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-[#FF6B00] flex-shrink-0" />
                <span className="text-gray-900 font-semibold text-sm sm:text-base">
                  {vehicle.route_from}
                  <span className="text-gray-400 mx-1.5 font-normal">→</span>
                  {vehicle.route_to}
                </span>
              </div>

              {vehicle.central_location && (
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500">
                    Staged at <span className="font-medium text-gray-700">{vehicle.central_location}</span>
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[#FF6B00]">KES {vehicle.price_per_seat + 100}</span>
                  <span className="text-gray-400 text-xs">/seat</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Car className="w-3.5 h-3.5" />
                  <span>{totalSeats}-seater</span>
                </div>
                {!photo && (
                  <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${
                    available === 0 ? 'bg-red-100 text-red-600' : available <= 3 ? 'bg-orange-100 text-[#FF6B00]' : 'bg-green-100 text-green-700'
                  }`}>
                    {available === 0 ? 'Full' : `${available} seat${available !== 1 ? 's' : ''} left`}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 text-right space-y-1.5 min-w-[110px]">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-sm font-semibold text-gray-900 truncate max-w-[100px]">
                  {vehicle.profiles.full_name}
                </span>
                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <a
                  href={`tel:${vehicle.profiles.phone}`}
                  className="text-xs text-[#FF6B00] font-medium hover:text-orange-700 flex items-center gap-1 transition-colors"
                >
                  {vehicle.profiles.phone}
                  <PhoneCall className="w-3 h-3" />
                </a>
              </div>
              {vehicle.registration_number && !photo && (
                <div className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 text-right border border-gray-200">
                  {vehicle.registration_number}
                </div>
              )}
              {vehicle.sacco && (
                <div className="text-xs text-gray-500 truncate max-w-[110px]">{vehicle.sacco}</div>
              )}
              {rating && (
                <div className="flex items-center justify-end gap-1 pt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-gray-900">{rating}</span>
                  <span className="text-xs text-gray-400">({vehicle.reviews.length})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setReviewVehicle(vehicle)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Reviews</span>
            </button>
            {isTraveling ? (
              <a
                href={`tel:${vehicle.profiles.phone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 py-2 rounded-xl font-semibold text-sm hover:bg-blue-100 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Driver
              </a>
            ) : available > 0 ? (
              <button
                onClick={() => handleBookVehicle(vehicle)}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-2 rounded-xl font-semibold text-sm hover:bg-[#e55f00] transition-colors shadow-sm shadow-orange-500/20"
              >
                Book a Seat
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled
                className="flex-1 bg-gray-100 text-gray-400 border border-gray-200 py-2 rounded-xl font-semibold text-sm cursor-not-allowed"
              >
                Fully Booked
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (showSongaAI) return <SongaAI onBack={() => setShowSongaAI(false)} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">Songa</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {profile ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Find your ride'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSongaAI(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#FF6B00] bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Songa AI</span>
              </button>
              {user ? (
                <>
                  <button
                    onClick={() => setShowBookingHistory(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">My Trips</span>
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setSelectedVehicle(null); setShowAuth(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white text-sm font-semibold rounded-xl hover:bg-[#e55f00] transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="pb-3.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search route — e.g. Meru, Nairobi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/40 focus:border-[#FF6B00] outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* LIVE TRIPS */}
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#FF6B00]" />
                    Live Trips
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Sorted by soonest departure</p>
                </div>
                {upcoming.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {upcoming.length} ride{upcoming.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {upcoming.length === 0 ? (
                <div className="text-center py-14 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Car className="w-8 h-8 text-[#FF6B00] opacity-60" />
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">No upcoming rides</h3>
                  <p className="text-gray-500 text-sm">Drivers go live before departure — check back soon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((v, i) => (
                    <TripCard key={v.id} vehicle={v} idx={i} section="upcoming" />
                  ))}
                </div>
              )}
            </section>

            {/* ALREADY TRAVELING */}
            {traveling.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Already Traveling</h2>
                    <p className="text-xs text-gray-500 mt-0.5">These trips have departed</p>
                  </div>
                  <span className="text-xs text-gray-400">{traveling.length} trip{traveling.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3">
                  {traveling.map((v, i) => (
                    <TripCard key={v.id} vehicle={v} idx={i} section="traveling" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Auth modal */}
      {showAuth && (
        <Auth
          modal
          onClose={() => {
            setShowAuth(false);
            if (!user) setSelectedVehicle(null);
          }}
        />
      )}

      {/* Pickup location modal */}
      {showPickup && selectedVehicle && selectedSeat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-sm rounded-t-2xl shadow-2xl">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Your Pickup Point</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Seat {selectedSeat} · {selectedVehicle.route_from} → {selectedVehicle.route_to}</p>
                </div>
                <button
                  onClick={() => { setShowPickup(false); setSelectedSeat(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm"
                >✕</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                <MapPin className="w-8 h-8 text-[#FF6B00] flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Where should we pick you up?</div>
                  <div className="text-xs text-gray-500 mt-0.5">Search for a place or use your current location.</div>
                </div>
              </div>

              <LocationSearch
                value={pickupLocation}
                lat={pickupLat}
                lng={pickupLng}
                onChange={(loc, lat, lng) => {
                  setPickupLocation(loc);
                  setPickupLat(lat);
                  setPickupLng(lng);
                }}
                placeholder="e.g. Meru Town, Total Petrol Station…"
              />

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowPickup(false); setSelectedSeat(null); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => { setShowPickup(false); setShowPayment(true); }}
                  disabled={!pickupLat}
                  className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
              <button
                onClick={() => { setShowPickup(false); setShowPayment(true); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1 transition-colors"
              >
                Skip — I'll board at the departure point
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seat selector modal */}
      {selectedVehicle && !showAuth && !showPayment && !showPickup && user && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-sm max-h-[92vh] overflow-y-auto rounded-t-2xl shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-gray-900">Choose Your Seat</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedVehicle.route_from} → {selectedVehicle.route_to}
                  &ensp;·&ensp;
                  {formatTime(selectedVehicle.departure_time)}
                </p>
              </div>
              <button
                onClick={() => { setSelectedVehicle(null); setSelectedSeat(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mx-4 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Driver</div>
                <div className="text-sm font-semibold text-gray-900">{selectedVehicle.profiles.full_name}</div>
              </div>
              <a
                href={`tel:${selectedVehicle.profiles.phone}`}
                className="flex items-center gap-1.5 bg-[#FF6B00] text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[#e55f00] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {selectedVehicle.profiles.phone}
              </a>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-gray-500">Price per seat</span>
                <span className="font-bold text-[#FF6B00] text-base">KES {selectedVehicle.price_per_seat + 100}</span>
              </div>
              <SeatSelector
                vehicle={selectedVehicle}
                onSeatSelect={handleSeatSelect}
                selectedSeat={selectedSeat}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && selectedVehicle && selectedSeat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-sm rounded-t-2xl shadow-2xl">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Confirm Booking</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedVehicle.route_from} → {selectedVehicle.route_to}
              </p>
            </div>

            {bookingSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-green-600">✓</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">Booking Confirmed!</h4>
                <p className="text-sm text-gray-500">Seat {selectedSeat} is yours.</p>
                <p className="text-sm font-medium text-[#FF6B00] mt-1">
                  Driver: {selectedVehicle.profiles.phone}
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Seat</span>
                    <span className="font-bold text-gray-900">#{selectedSeat}</span>
                  </div>
                  {pickupLocation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Pickup</span>
                      <span className="text-gray-900 text-right max-w-[160px] leading-tight">{pickupLocation.split(',').slice(0, 2).join(',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fare</span>
                    <span className="text-gray-900">KES {selectedVehicle.price_per_seat}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee</span>
                    <span className="text-gray-900">KES 100</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-orange-200 pt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-[#FF6B00] text-lg">KES {selectedVehicle.price_per_seat + 100}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4">
                  <div className="text-sm">
                    <div className="text-xs text-gray-500">Driver</div>
                    <div className="font-medium text-gray-900">{selectedVehicle.profiles.full_name}</div>
                  </div>
                  <a
                    href={`tel:${selectedVehicle.profiles.phone}`}
                    className="flex items-center gap-1.5 text-[#FF6B00] text-sm font-medium hover:text-orange-700 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {selectedVehicle.profiles.phone}
                  </a>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={mpesaNumber}
                    onChange={(e) => setMpesaNumber(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/40 focus:border-[#FF6B00] outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowPayment(false); setShowPickup(true); }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                    disabled={bookingLoading}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={bookingLoading || !mpesaNumber}
                    className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-xl font-semibold text-sm hover:bg-[#e55f00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bookingLoading ? 'Processing...' : 'Confirm & Pay'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {reviewVehicle && (
        <ReviewModal
          vehicle={reviewVehicle}
          onClose={() => setReviewVehicle(null)}
          hasBooked={userBookings.some((b) => b.vehicle_id === reviewVehicle.id)}
        />
      )}

      {showBookingHistory && profile && (
        <BookingHistory passengerId={profile.id} onClose={() => setShowBookingHistory(false)} />
      )}

      <Footer />
    </div>
  );
};
