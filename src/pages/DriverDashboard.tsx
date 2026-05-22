import React, { useState, useEffect, useRef, FC } from 'react';
import {
  LogOut, Car, Plus, Users, Clock, MapPin, DollarSign,
  Navigation, Phone, X, Map, Camera, Upload, Trash2, Sparkles,
} from 'lucide-react';
import { SongaAI } from './SongaAI';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Vehicle, Booking, Profile, PASSENGER_SEATS } from '../lib/supabase';
import { DriverLocationPanel } from '../components/DriverLocationPanel';
import { Footer } from '../components/Footer';

type VehicleStatus = Vehicle['status'];

const STATUS_LABELS: Record<VehicleStatus, string> = {
  pending: 'Pending',
  traveling: 'Traveling',
  completed: 'Completed',
  canceled: 'Canceled',
};

const STATUS_COLORS: Record<VehicleStatus, string> = {
  pending: 'bg-emerald-100 text-emerald-700',
  traveling: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  canceled: 'bg-red-100 text-red-500',
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

async function uploadVehicleImage(file: File, driverId: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${driverId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  return data.publicUrl;
}

export const DriverDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookings, setBookings] = useState<(Booking & { profiles: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSongaAI, setShowSongaAI] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    seat_count: 14,
    route_from: 'Meru',
    route_to: 'Nairobi',
    price_per_seat: 1000,
    departure_time: '',
    registration_number: '',
    sacco: '',
    central_location: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    fetchBookings(selectedVehicle.id);
    const sub = supabase
      .channel(`bookings:${selectedVehicle.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `vehicle_id=eq.${selectedVehicle.id}`,
      }, () => fetchBookings(selectedVehicle.id))
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [selectedVehicle]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', profile?.id)
      .order('departure_time', { ascending: false });
    if (data) setVehicles(data);
    setLoading(false);
  };

  const fetchBookings = async (vehicleId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, profiles(*)')
      .eq('vehicle_id', vehicleId)
      .eq('payment_status', 'completed')
      .order('seat_number', { ascending: true });
    if (data) setBookings(data as any);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setUploading(true);

    let photos: string[] = [];
    if (imageFile) {
      const url = await uploadVehicleImage(imageFile, profile.id);
      if (url) photos = [url];
    }

    const { error } = await supabase.from('vehicles').insert({
      driver_id: profile.id,
      seat_count: vehicleForm.seat_count,
      vehicle_type: vehicleForm.seat_count <= 10 ? '10_seater' : '14_seater',
      route_from: vehicleForm.route_from,
      route_to: vehicleForm.route_to,
      price_per_seat: vehicleForm.price_per_seat,
      departure_time: vehicleForm.departure_time,
      registration_number: vehicleForm.registration_number,
      sacco: vehicleForm.sacco,
      central_location: vehicleForm.central_location,
      photos,
    });
    setUploading(false);
    if (!error) {
      setShowAddVehicle(false);
      fetchVehicles();
      setVehicleForm({
        seat_count: 14,
        route_from: 'Meru',
        route_to: 'Nairobi',
        price_per_seat: 1000,
        departure_time: '',
        registration_number: '',
        sacco: '',
        central_location: '',
      });
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const toggleLive = async (vehicle: Vehicle) => {
    await supabase
      .from('vehicles')
      .update({ is_live: !vehicle.is_live })
      .eq('id', vehicle.id);
    fetchVehicles();
  };

  const updateStatus = async (vehicle: Vehicle, status: VehicleStatus) => {
    await supabase
      .from('vehicles')
      .update({ status, is_live: status === 'pending' ? vehicle.is_live : status === 'traveling' })
      .eq('id', vehicle.id);
    fetchVehicles();
  };

  const bookedCountFor = (vehicleId: string) =>
    bookings.filter((b) => b.vehicle_id === vehicleId).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeVehicles = vehicles.filter((v) => v.status !== 'completed' && v.status !== 'canceled');
  const pastVehicles = vehicles.filter((v) => v.status === 'completed' || v.status === 'canceled');

  if (showSongaAI) return <SongaAI onBack={() => setShowSongaAI(false)} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex justify-between items-center py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">Songa Driver</h1>
              <p className="text-xs text-gray-500 mt-0.5">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSongaAI(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#FF6B00] bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Songa AI</span>
            </button>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="flex items-center gap-1.5 bg-[#FF6B00] text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-colors shadow-sm shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Trip</span>
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-8">

        {/* Active trips */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Active Trips
            <span className="ml-2 text-xs font-normal text-gray-400">({activeVehicles.length})</span>
          </h2>

          {activeVehicles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
              <Car className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No active trips. Add one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeVehicles.map((vehicle) => {
                const totalSeats = PASSENGER_SEATS[vehicle.vehicle_type];
                const booked = bookedCountFor(vehicle.id);
                const available = totalSeats - booked;
                const photo = vehicle.photos?.[0];

                return (
                  <div key={vehicle.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Car photo banner */}
                    {photo && (
                      <div className="h-36 sm:h-44 w-full relative overflow-hidden bg-gray-100">
                        <img
                          src={photo}
                          alt={vehicle.registration_number}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <span className="absolute bottom-2 left-3 text-white text-xs font-mono font-semibold bg-black/30 px-2 py-0.5 rounded">
                          {vehicle.registration_number}
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                            <span className="font-bold text-gray-900 text-sm">
                              {vehicle.route_from} → {vehicle.route_to}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {new Date(vehicle.departure_time).toLocaleDateString('en-KE', {
                                weekday: 'short', month: 'short', day: 'numeric',
                              })} at {formatTime(vehicle.departure_time)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {!photo && (
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                {vehicle.registration_number || 'No plate'}
                              </span>
                            )}
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {vehicle.seat_count || (vehicle.vehicle_type === '14_seater' ? 14 : 10)}-seater
                            </span>
                            <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              <DollarSign className="w-3 h-3" />
                              KES {vehicle.price_per_seat}
                            </span>
                          </div>
                          {vehicle.central_location && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                              <span className="text-xs text-gray-500 truncate">{vehicle.central_location}</span>
                            </div>
                          )}
                        </div>

                        {/* Seats available */}
                        <div className="text-right flex-shrink-0">
                          <div className={`text-2xl font-black ${available === 0 ? 'text-red-500' : 'text-orange-600'}`}>
                            {available}
                          </div>
                          <div className="text-xs text-gray-400">of {totalSeats} free</div>
                        </div>
                      </div>

                      {/* Status + live row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Live toggle */}
                        <button
                          onClick={() => toggleLive(vehicle)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            vehicle.is_live
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${vehicle.is_live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {vehicle.is_live ? 'Live' : 'Offline'}
                        </button>

                        {/* Status selector */}
                        <div className="flex gap-1.5 flex-wrap">
                          {(['pending', 'traveling', 'completed'] as VehicleStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => updateStatus(vehicle, s)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                vehicle.status === s
                                  ? STATUS_COLORS[s]
                                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                              }`}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="ml-auto flex items-center gap-1 text-xs text-orange-600 font-semibold hover:underline"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Passengers ({booked})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past trips */}
        {pastVehicles.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">
              Past Trips
              <span className="ml-2 text-xs font-normal text-gray-400">({pastVehicles.length})</span>
            </h2>
            <div className="space-y-2">
              {pastVehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden opacity-70">
                  {vehicle.photos?.[0] && (
                    <div className="h-24 w-full overflow-hidden bg-gray-100">
                      <img src={vehicle.photos[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-700">
                        {vehicle.route_from} → {vehicle.route_to}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(vehicle.departure_time).toLocaleDateString('en-KE', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[vehicle.status]}`}>
                      {STATUS_LABELS[vehicle.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Add vehicle modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add New Trip</h3>
              <button
                onClick={() => setShowAddVehicle(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddVehicle} className="p-4 space-y-4">

              {/* Car Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Car Photo</label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 h-40">
                    <img src={imagePreview} alt="Car preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors bg-gray-50 hover:bg-orange-50"
                  >
                    <Camera className="w-7 h-7" />
                    <span className="text-sm font-medium">Upload car photo</span>
                    <span className="text-xs">JPG, PNG — max 5 MB</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Seat count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Seats
                  <span className="ml-2 text-xs text-gray-400 font-normal">— system generates seats automatically</span>
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setVehicleForm({ ...vehicleForm, seat_count: Math.max(4, vehicleForm.seat_count - 1) })}
                    className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors text-lg"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-black text-[#FF6B00]">{vehicleForm.seat_count}</span>
                    <span className="text-gray-500 ml-1 text-sm">seats</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVehicleForm({ ...vehicleForm, seat_count: Math.min(60, vehicleForm.seat_count + 1) })}
                    className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors text-lg"
                  >+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[4, 5, 7, 8, 10, 14, 18, 25, 33, 45, 52].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setVehicleForm({ ...vehicleForm, seat_count: n })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        vehicleForm.seat_count === n
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {vehicleForm.seat_count <= 5 ? 'Sedan / Saloon' :
                   vehicleForm.seat_count <= 8 ? 'SUV / Station Wagon' :
                   vehicleForm.seat_count <= 14 ? 'Matatu / Minivan' :
                   vehicleForm.seat_count <= 25 ? 'Minibus' :
                   vehicleForm.seat_count <= 45 ? 'Coach Bus' : 'Large Coach'}
                </p>
              </div>

              {/* Route */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.route_from}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, route_from: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Meru"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.route_to}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, route_to: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Nairobi"
                  />
                </div>
              </div>

              {/* Reg + SACCO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  required
                  value={vehicleForm.registration_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value.toUpperCase() })}
                  placeholder="KXX 123Y"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SACCO</label>
                <input
                  type="text"
                  required
                  value={vehicleForm.sacco}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, sacco: e.target.value })}
                  placeholder="e.g. Meru Matatu SACCO"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Central / Staging Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={vehicleForm.central_location}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, central_location: e.target.value })}
                    placeholder="e.g. Meru Town Stage, Makutano"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Where your vehicle is parked / available from</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Seat (KES)</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={vehicleForm.price_per_seat}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, price_per_seat: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departure Time</label>
                <input
                  type="datetime-local"
                  required
                  value={vehicleForm.departure_time}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, departure_time: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Add Trip'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bookings + Map modal */}
      {selectedVehicle && (
        <BookingsModal
          vehicle={selectedVehicle}
          bookings={bookings}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
};

// ── Bookings modal with tabs: Passengers | Map ─────────────────────────────
type BookingsModalProps = {
  vehicle: Vehicle;
  bookings: (Booking & { profiles: Profile })[];
  onClose: () => void;
};

const BookingsModal: React.FC<BookingsModalProps> = ({ vehicle, bookings, onClose }) => {
  const [tab, setTab] = useState<'passengers' | 'map'>('passengers');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-hidden flex flex-col rounded-t-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Trip Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {vehicle.route_from} → {vehicle.route_to}
              &ensp;·&ensp;
              {bookings.length}/{vehicle.seat_count || PASSENGER_SEATS[vehicle.vehicle_type] || 14} booked
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('passengers')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'passengers' ? 'text-orange-600 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            Passengers
          </button>
          <button
            onClick={() => setTab('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'map' ? 'text-orange-600 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            <Map className="w-4 h-4" />
            Map & Tracking
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {tab === 'passengers' ? (
            bookings.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No bookings yet</div>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{booking.profiles.full_name}</div>
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <a href={`tel:${booking.profiles.phone}`} className="text-orange-600 hover:underline">
                            {booking.profiles.phone}
                          </a>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-orange-600">Seat {booking.seat_number}</div>
                        <div className="text-xs text-gray-400">KES {booking.amount_paid}</div>
                      </div>
                    </div>
                    {booking.pickup_location && (
                      <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                        <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-emerald-700 truncate">{booking.pickup_location}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <DriverLocationPanel vehicle={vehicle} bookings={bookings as any} />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};
