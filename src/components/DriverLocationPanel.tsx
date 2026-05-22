import React, { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, Bell, BellOff, Loader, Radio } from 'lucide-react';
import { supabase, Vehicle, Booking, Profile } from '../lib/supabase';
import { distanceMetres, requestNotificationPermission, notify } from '../lib/maps';
import { TripMap, MapMarker } from './TripMap';

type BookingWithPassenger = Booking & { profiles: Profile };

type Props = {
  vehicle: Vehicle;
  bookings: BookingWithPassenger[];
};

const NOTIFY_DISTANCE_M = 600; // notify when driver is within 600m of a pickup

export const DriverLocationPanel: React.FC<Props> = ({ vehicle, bookings }) => {
  const [tracking, setTracking] = useState(false);
  const [notifAllowed, setNotifAllowed] = useState(Notification.permission === 'granted');
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(
    vehicle.driver_lat != null && vehicle.driver_lng != null
      ? { lat: vehicle.driver_lat, lng: vehicle.driver_lng }
      : null,
  );
  const watchId = useRef<number | null>(null);
  const notifiedSeats = useRef<Set<number>>(new Set());

  // Pickups with coordinates
  const pickups = bookings.filter((b) => b.pickup_lat != null && b.pickup_lng != null);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) return;
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPos({ lat, lng });

        // Write to DB
        await supabase
          .from('vehicles')
          .update({ driver_lat: lat, driver_lng: lng, driver_location_updated_at: new Date().toISOString() })
          .eq('id', vehicle.id);

        // Proximity notifications for each pickup
        if (notifAllowed) {
          pickups.forEach((b) => {
            if (!b.pickup_lat || !b.pickup_lng) return;
            if (notifiedSeats.current.has(b.seat_number)) return;
            const dist = distanceMetres(lat, lng, b.pickup_lat, b.pickup_lng);
            if (dist <= NOTIFY_DISTANCE_M) {
              notifiedSeats.current.add(b.seat_number);
              notify(
                `Approaching Seat ${b.seat_number}`,
                `${b.profiles.full_name} is waiting at ${b.pickup_location || 'their pickup point'} — ${Math.round(dist)}m away.`,
              );
            }
          });
        }
      },
      () => setTracking(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  };

  const stopTracking = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
  };

  const enableNotifs = async () => {
    const ok = await requestNotificationPermission();
    setNotifAllowed(ok);
  };

  const markers: MapMarker[] = [];
  if (driverPos) {
    markers.push({
      ...driverPos,
      type: 'driver',
      popupHtml: `<b>Your position</b><br>Last updated just now`,
    });
  }
  pickups.forEach((b) => {
    markers.push({
      lat: b.pickup_lat!,
      lng: b.pickup_lng!,
      type: 'pickup',
      label: `S${b.seat_number}`,
      popupHtml: `<b>${b.profiles.full_name}</b><br>Seat ${b.seat_number}<br>${b.pickup_location || ''}`,
    });
  });

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={tracking ? stopTracking : startTracking}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tracking
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          {tracking ? (
            <><Radio className="w-4 h-4 animate-pulse" /> Stop Tracking</>
          ) : (
            <><Navigation className="w-4 h-4" /> Start Tracking</>
          )}
        </button>

        {!notifAllowed && (
          <button
            onClick={enableNotifs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Enable Alerts
          </button>
        )}
        {notifAllowed && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-3 py-2 bg-emerald-50 rounded-xl">
            <Bell className="w-3.5 h-3.5" />
            Pickup alerts on
          </div>
        )}

        {tracking && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium px-3 py-2 bg-orange-50 rounded-xl ml-auto">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Broadcasting live
          </div>
        )}
      </div>

      {/* Map */}
      {markers.length > 0 ? (
        <TripMap markers={markers} className="h-72 shadow-md" centerOnDriver={tracking} />
      ) : (
        <div className="h-48 bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2">
          <MapPin className="w-8 h-8 opacity-40" />
          <p className="text-sm">
            {driverPos ? 'No passenger pickup locations set yet' : 'Start tracking to see your position on the map'}
          </p>
        </div>
      )}

      {/* Pickup list */}
      {pickups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pickup Points</h4>
          {pickups.map((b) => {
            const dist = driverPos && b.pickup_lat && b.pickup_lng
              ? distanceMetres(driverPos.lat, driverPos.lng, b.pickup_lat, b.pickup_lng)
              : null;
            return (
              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-700">{b.seat_number}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{b.profiles.full_name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {b.pickup_location || `${b.pickup_lat?.toFixed(4)}, ${b.pickup_lng?.toFixed(4)}`}
                    </div>
                  </div>
                </div>
                {dist != null && (
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    dist <= NOTIFY_DISTANCE_M
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
