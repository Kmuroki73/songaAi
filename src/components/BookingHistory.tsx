import React, { useEffect, useState } from 'react';
import { Phone, MapPin, Calendar, Car, Clock, CheckCircle, Navigation, X } from 'lucide-react';
import { supabase, Booking, Vehicle, Profile } from '../lib/supabase';
import { PassengerTripMap } from './PassengerTripMap';

type BookingWithDetails = Booking & {
  vehicles: Vehicle & { profiles: Profile };
};

type Section = 'upcoming' | 'traveling' | 'completed';

type BookingHistoryProps = {
  passengerId: string;
  onClose: () => void;
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

function tripSection(booking: BookingWithDetails): Section {
  const v = booking.vehicles;
  if (v.status === 'completed' || v.status === 'canceled') return 'completed';
  if (v.status === 'traveling') return 'traveling';
  // pending: future departure = upcoming, past departure = also traveling
  if (new Date(v.departure_time).getTime() < Date.now()) return 'traveling';
  return 'upcoming';
}

export const BookingHistory: React.FC<BookingHistoryProps> = ({ passengerId, onClose }) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Section>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [passengerId]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, vehicles(*, profiles(*))')
      .eq('passenger_id', passengerId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    if (data) setBookings(data as any);
    setLoading(false);
  };

  const sections: Record<Section, BookingWithDetails[]> = {
    upcoming: bookings.filter((b) => tripSection(b) === 'upcoming'),
    traveling: bookings.filter((b) => tripSection(b) === 'traveling'),
    completed: bookings.filter((b) => tripSection(b) === 'completed'),
  };

  const tabs: { key: Section; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'upcoming', label: 'Upcoming', icon: <Clock className="w-4 h-4" />, color: 'orange' },
    { key: 'traveling', label: 'Traveling', icon: <Navigation className="w-4 h-4" />, color: 'blue' },
    { key: 'completed', label: 'Completed', icon: <CheckCircle className="w-4 h-4" />, color: 'gray' },
  ];

  const activeColor = activeTab === 'upcoming' ? 'orange' : activeTab === 'traveling' ? 'blue' : 'gray';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col rounded-t-2xl">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">My Trips</h3>
            <p className="text-xs text-gray-500 mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map(({ key, label, icon }) => {
            const count = sections[key].length;
            const isActive = activeTab === key;
            const tabColor =
              key === 'upcoming' ? 'text-orange-600 border-orange-500' :
              key === 'traveling' ? 'text-blue-600 border-blue-500' :
              'text-gray-600 border-gray-500';
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  isActive ? tabColor : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                <div className="flex items-center gap-1">
                  {icon}
                  {label}
                </div>
                <span className={`text-xs font-bold ${isActive ? '' : 'text-gray-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sections[activeTab].length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                {activeTab === 'upcoming' ? <Clock className="w-7 h-7 text-gray-300" /> :
                 activeTab === 'traveling' ? <Navigation className="w-7 h-7 text-gray-300" /> :
                 <CheckCircle className="w-7 h-7 text-gray-300" />}
              </div>
              <p className="text-gray-500 text-sm font-medium">
                {activeTab === 'upcoming' ? 'No upcoming trips' :
                 activeTab === 'traveling' ? 'No trips in progress' :
                 'No completed trips yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections[activeTab].map((booking) => {
                const v = booking.vehicles;
                const isExpanded = expandedId === booking.id;
                const borderColor =
                  activeTab === 'upcoming' ? 'border-orange-100' :
                  activeTab === 'traveling' ? 'border-blue-100' :
                  'border-gray-100';
                const badgeBg =
                  activeTab === 'upcoming' ? 'bg-orange-50 text-orange-700' :
                  activeTab === 'traveling' ? 'bg-blue-50 text-blue-700' :
                  'bg-gray-100 text-gray-600';

                return (
                  <div
                    key={booking.id}
                    className={`border rounded-xl overflow-hidden ${borderColor}`}
                  >
                    {/* Card summary */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {v.route_from} → {v.route_to}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(v.departure_time)} at {formatTime(v.departure_time)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xs font-bold px-2 py-1 rounded-full mb-1 ${badgeBg}`}>
                            Seat {booking.seat_number}
                          </div>
                          <div className="text-xs text-gray-500">KES {booking.amount_paid}</div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        {/* Live trip map (traveling section) */}
                        {activeTab === 'traveling' && (
                          <PassengerTripMap booking={booking} />
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <Car className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">
                            {v.registration_number || 'N/A'}
                            <span className="text-gray-400 ml-1.5">
                              ({v.vehicle_type === '14_seater' ? '14' : '10'}-seater)
                            </span>
                          </span>
                        </div>
                        {v.sacco && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">SACCO:</span> {v.sacco}
                          </div>
                        )}
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Driver:</span> {v.profiles.full_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          <a
                            href={`tel:${v.profiles.phone}`}
                            className="text-sm text-emerald-600 font-semibold hover:underline"
                          >
                            {v.profiles.phone}
                          </a>
                          <span className="text-xs text-gray-400">(tap to call)</span>
                        </div>
                        {booking.pickup_location && (
                          <div className="flex items-start gap-2 p-2.5 bg-emerald-50 rounded-xl">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-emerald-700">Your pickup point</div>
                              <div className="text-xs text-emerald-600 mt-0.5">{booking.pickup_location}</div>
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 pt-1">
                          Booked on {new Date(booking.created_at).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
