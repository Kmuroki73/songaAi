import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, Loader } from 'lucide-react';
import { supabase, Vehicle, Booking } from '../lib/supabase';
import { distanceMetres } from '../lib/maps';
import { TripMap, MapMarker } from './TripMap';

type Props = {
  booking: Booking;
};

export const PassengerTripMap: React.FC<Props> = ({ booking }) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicle();

    // Subscribe to real-time driver location updates
    const sub = supabase
      .channel(`driver-location-${booking.vehicle_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicles',
        filter: `id=eq.${booking.vehicle_id}`,
      }, (payload) => {
        setVehicle(payload.new as Vehicle);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [booking.vehicle_id]);

  const fetchVehicle = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', booking.vehicle_id)
      .maybeSingle();
    if (data) setVehicle(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-50 rounded-2xl">
        <Loader className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!vehicle) return null;

  const hasDriverLocation = vehicle.driver_lat != null && vehicle.driver_lng != null;
  const hasPickup = booking.pickup_lat != null && booking.pickup_lng != null;

  const markers: MapMarker[] = [];
  if (hasDriverLocation) {
    markers.push({
      lat: vehicle.driver_lat!,
      lng: vehicle.driver_lng!,
      type: 'driver',
      popupHtml: `<b>Your matatu</b><br>${vehicle.route_from} → ${vehicle.route_to}`,
    });
  }
  if (hasPickup) {
    markers.push({
      lat: booking.pickup_lat!,
      lng: booking.pickup_lng!,
      type: 'pickup',
      label: 'You',
      popupHtml: `<b>Your pickup</b><br>${booking.pickup_location || 'Your location'}`,
    });
  }

  const dist = hasDriverLocation && hasPickup
    ? distanceMetres(vehicle.driver_lat!, vehicle.driver_lng!, booking.pickup_lat!, booking.pickup_lng!)
    : null;

  return (
    <div className="space-y-3">
      {hasDriverLocation || hasPickup ? (
        <TripMap markers={markers} className="h-56 shadow-sm" />
      ) : (
        <div className="h-36 bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2">
          <Navigation className="w-8 h-8 opacity-40" />
          <p className="text-sm">Driver location not yet broadcast</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {hasDriverLocation ? (
          <div className="flex-1 bg-orange-50 rounded-xl p-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-base flex-shrink-0">🚐</div>
            <div>
              <div className="text-xs text-gray-500">Driver is live</div>
              <div className="text-xs font-semibold text-gray-800">
                {vehicle.driver_location_updated_at
                  ? `Updated ${timeAgo(vehicle.driver_location_updated_at)}`
                  : 'Location active'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 rounded-xl p-3 flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Waiting for driver to go live</span>
          </div>
        )}

        {dist != null && (
          <div className={`px-4 py-3 rounded-xl text-center flex-shrink-0 ${
            dist <= 1000 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className="text-lg font-black leading-none">
              {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
            </div>
            <div className="text-xs mt-0.5">away</div>
          </div>
        )}
      </div>

      {hasPickup && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
          <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-700 font-medium">
            Your pickup: {booking.pickup_location || `${booking.pickup_lat?.toFixed(4)}, ${booking.pickup_lng?.toFixed(4)}`}
          </span>
        </div>
      )}
    </div>
  );
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
