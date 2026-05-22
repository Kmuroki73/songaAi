import React, { useState, useEffect } from 'react';
import {
  Navigation, Package, ArrowLeft, ArrowRight, Sparkles, MapPin,
  Shield, AlertTriangle, CheckCircle, Truck, DollarSign, Clock,
  Users, Phone, MessageSquare, Bell, FileText, Star, Eye, X,
  ChevronDown, ChevronUp, Zap, Building2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Auth } from './Auth';
import type { Page } from './Landing';

type Props = { onNavigate: (page: Page) => void };

type Role = 'client' | 'driver' | 'transporter';

type ShipmentForm = {
  from: string; to: string; weight: number; description: string;
  is_fragile: boolean; is_hazardous: boolean;
  urgency: 'standard' | 'express' | 'overnight';
  sender_phone: string; receiver_phone: string; receiver_name: string;
  insurance: boolean; cost_share: boolean;
  cargo_category: 'parcel' | 'produce' | 'machinery' | 'livestock' | 'electronics' | 'furniture' | 'other';
};

type Quote = {
  base: number; weight: number; fragile: number; hazardous: number;
  fuel: number; insurance: number; platform: number;
  urgencyMult: number; subtotal: number; vat: number; total: number;
  upfront: number; on_delivery: number;
};

type TruckListing = {
  id: string; driver_name: string; driver_phone: string; route_from: string; route_to: string;
  capacity_kg: number; truck_type: string; price_per_kg: number; available_kg: number;
  departure_date: string; insurance: boolean; registration: string; status: string;
  cost_share_slots: number; cost_share_filled: number;
};

const DIST: Record<string, Record<string, number>> = {
  Nairobi: { Mombasa:480, Kisumu:350, Nakuru:160, Meru:240, Eldoret:320, Kampala:670, Dar:860, Kigali:720 },
  Mombasa: { Nairobi:480, Kisumu:740, Meru:620, Dar:490 },
  Kisumu: { Nairobi:350, Kampala:220, Eldoret:150 },
  Nakuru: { Nairobi:160, Kisumu:190, Eldoret:180 },
  Eldoret: { Nairobi:320, Kampala:350 },
  Kampala: { Nairobi:670, Kigali:500, Dar:1100 },
  Kigali: { Nairobi:720, Kampala:500, Dar:600 },
  Dar: { Nairobi:860, Kampala:1100, Mombasa:490 },
};

const CARGO_CATEGORIES = [
  { k: 'parcel', label: 'Parcel / Documents' },
  { k: 'produce', label: 'Farm Produce' },
  { k: 'machinery', label: 'Machinery / Tools' },
  { k: 'livestock', label: 'Livestock' },
  { k: 'electronics', label: 'Electronics' },
  { k: 'furniture', label: 'Furniture / Household' },
  { k: 'other', label: 'Other' },
] as const;

const DEMO_TRUCKS: TruckListing[] = [
  { id: 't1', driver_name: 'James Mwangi', driver_phone: '0712345678', route_from: 'Nairobi', route_to: 'Mombasa', capacity_kg: 5000, truck_type: '7-Tonne Lorry', price_per_kg: 18, available_kg: 3200, departure_date: '2026-05-28', insurance: true, registration: 'KCB 234X', status: 'available', cost_share_slots: 4, cost_share_filled: 2 },
  { id: 't2', driver_name: 'Peter Kamau', driver_phone: '0723456789', route_from: 'Nairobi', route_to: 'Kampala', capacity_kg: 10000, truck_type: '10-Tonne Truck', price_per_kg: 22, available_kg: 7500, departure_date: '2026-05-29', insurance: true, registration: 'KDD 567Y', status: 'available', cost_share_slots: 3, cost_share_filled: 1 },
  { id: 't3', driver_name: 'Grace Wanjiku', driver_phone: '0734567890', route_from: 'Kisumu', route_to: 'Nairobi', capacity_kg: 3000, truck_type: '3-Tonne Van', price_per_kg: 15, available_kg: 1800, departure_date: '2026-05-27', insurance: false, registration: 'KCF 890Z', status: 'available', cost_share_slots: 5, cost_share_filled: 3 },
  { id: 't4', driver_name: 'Ali Hassan', driver_phone: '0745678901', route_from: 'Mombasa', route_to: 'Nairobi', capacity_kg: 8000, truck_type: '8-Tonne Lorry', price_per_kg: 20, available_kg: 5000, departure_date: '2026-05-30', insurance: true, registration: 'KBX 123A', status: 'available', cost_share_slots: 4, cost_share_filled: 0 },
];

function dist(from: string, to: string) {
  const a = Object.keys(DIST).find(k => from.toLowerCase().includes(k.toLowerCase()));
  const b = Object.keys(DIST).find(k => to.toLowerCase().includes(k.toLowerCase()));
  if (a && b) return DIST[a]?.[b] ?? DIST[b]?.[a] ?? 350;
  return 350;
}

function calcQuote(f: ShipmentForm): Quote {
  const d = dist(f.from, f.to);
  const base = Math.round(500 + d * 0.85);
  const weight = Math.round(f.weight * 22);
  const fragile = f.is_fragile ? Math.round(base * 0.15) : 0;
  const hazardous = f.is_hazardous ? Math.round(base * 0.28) : 0;
  const fuel = Math.round((base + weight) * 0.13);
  const insurance = f.insurance ? Math.round((base + weight) * 0.055 + 250) : 0;
  const platform = 200;
  const urgencyMult = f.urgency === 'overnight' ? 2.0 : f.urgency === 'express' ? 1.5 : 1.0;
  const subtotal = Math.round((base + weight + fragile + hazardous + fuel + insurance + platform) * urgencyMult);
  const vat = Math.round(subtotal * 0.16);
  const total = subtotal + vat;
  return { base, weight, fragile, hazardous, fuel, insurance, platform, urgencyMult, subtotal, vat, total, upfront: Math.round(total * 0.7), on_delivery: Math.round(total * 0.3) };
}

function trackingCode() {
  return 'SNG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
}

const INP = "w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-400 outline-none";
const STEPS = ['Details', 'Quote', 'Payment', 'Done'] as const;
const URGENCY = {
  standard: { label: 'Standard', days: '3–5 days', mult: '1×' },
  express: { label: 'Express', days: '1–2 days', mult: '1.5×' },
  overnight: { label: 'Overnight', days: 'Next day', mult: '2×' },
};

const TABS = [
  { id: 'book', label: 'Book Cargo', icon: Package },
  { id: 'trucks', label: 'Available Trucks', icon: Truck },
  { id: 'track', label: 'Track Shipment', icon: MapPin },
] as const;

export const Cargo: React.FC<Props> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'book' | 'trucks' | 'track'>('book');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ShipmentForm>({
    from: '', to: '', weight: 5, description: '',
    is_fragile: false, is_hazardous: false, urgency: 'standard',
    sender_phone: profile?.phone ?? '', receiver_phone: '', receiver_name: '', insurance: false,
    cost_share: false, cargo_category: 'other',
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [code] = useState(trackingCode);
  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(profile?.phone ?? '');
  const [paymentStep, setPaymentStep] = useState<'pending' | 'stk_sent' | 'confirmed'>('pending');
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<null | { status: string; route: string; updated: string }>(null);
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.phone) {
      setMpesaPhone(profile.phone);
      setForm(p => ({ ...p, sender_phone: profile.phone }));
    }
  }, [profile]);

  const f = (k: keyof ShipmentForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  const getQuote = (e: React.FormEvent) => { e.preventDefault(); setQuote(calcQuote(form)); setStep(1); };

  const simulateMpesa = () => {
    setPaymentStep('stk_sent');
    setTimeout(() => setPaymentStep('confirmed'), 3000);
  };

  const confirm = async () => {
    if (!user) { setShowAuth(true); return; }
    setSaving(true);
    await supabase.from('cargo_shipments').insert({
      owner_id: user.id, origin: form.from, destination: form.to,
      weight_kg: form.weight, cargo_type: form.description,
      special_handling: [form.is_fragile && 'fragile', form.is_hazardous && 'hazardous'].filter(Boolean).join(', ') || null,
      urgency: form.urgency === 'overnight' ? 'same_day' : form.urgency,
      price_breakdown: { ...quote, meta: { sender_phone: form.sender_phone, receiver_name: form.receiver_name, receiver_phone: form.receiver_phone } },
      price_estimate: quote?.total, tracking_code: code, status: 'pending',
    }).then(() => {});
    setSaving(false);
    setStep(3);
  };

  const handleTrack = () => {
    if (!trackCode.trim()) return;
    if (trackCode.toUpperCase().startsWith('SNG-')) {
      setTrackResult({ status: 'In Transit', route: 'Nairobi → Mombasa', updated: '2 hours ago' });
    } else {
      setTrackResult(null);
    }
  };

  const StepBar = () => (
    <div className="flex items-center gap-1.5 pb-3">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === i ? 'text-[#FF6B00]' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 ${step === i ? 'bg-[#FF6B00] border-[#FF6B00] text-white' : i < step ? 'bg-green-100 border-green-500 text-green-600' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="hidden sm:block">{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('landing')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center ml-1">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="ml-1">
              <div className="text-sm font-black text-gray-900 leading-none">Songa Cargo</div>
              <div className="text-xs text-gray-500">AI-powered logistics</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-black text-gray-900">Songa AI</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex border-t border-gray-100">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === id ? 'text-[#FF6B00] border-[#FF6B00]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* BOOK CARGO TAB */}
        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto">
            <StepBar />

            {step === 0 && (
              <form onSubmit={getQuote} className="space-y-4 animate-fade-in">
                {/* Route */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#FF6B00]" />Route
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                      <input required value={form.from} onChange={e => f('from', e.target.value)} placeholder="e.g. Nairobi" className={INP} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                      <input required value={form.to} onChange={e => f('to', e.target.value)} placeholder="e.g. Kampala" className={INP} />
                    </div>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FF6B00]" />Cargo Details
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {CARGO_CATEGORIES.map(({ k, label }) => (
                          <button key={k} type="button" onClick={() => f('cargo_category', k)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${form.cargo_category === k ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                      <input required value={form.description} onChange={e => f('description', e.target.value)} placeholder="e.g. 10 bags of maize, electronics, machinery..." className={INP} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                      <div className="flex items-center gap-3 mb-2">
                        <button type="button" onClick={() => f('weight', Math.max(0.5, +(form.weight - 0.5).toFixed(1)))}
                          className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors">−</button>
                        <div className="flex-1 text-center text-3xl font-black text-[#FF6B00]">{form.weight} kg</div>
                        <button type="button" onClick={() => f('weight', +(form.weight + 0.5).toFixed(1))}
                          className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors">+</button>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[1,5,10,25,50,100,500,1000].map(n => (
                          <button key={n} type="button" onClick={() => f('weight', n)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${form.weight === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                            {n >= 1000 ? `${n/1000}t` : `${n}kg`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[{ k: 'is_fragile', l: 'Fragile' }, { k: 'is_hazardous', l: 'Hazardous' }].map(({ k, l }) => (
                        <label key={k}
                          className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${(form as any)[k] ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}>
                          <input type="checkbox" checked={(form as any)[k]} onChange={e => f(k as any, e.target.checked)} className="hidden" />
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Speed */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF6B00]" />Delivery Speed
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(URGENCY) as [string, typeof URGENCY.standard][]).map(([k, u]) => (
                      <button key={k} type="button" onClick={() => f('urgency', k)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-0.5 transition-all ${form.urgency === k ? 'border-[#FF6B00] bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                        <span className={`text-xs font-bold ${form.urgency === k ? 'text-[#FF6B00]' : 'text-gray-600'}`}>{u.label}</span>
                        <span className="text-xs text-gray-400">{u.days}</span>
                        <span className={`text-xs font-semibold ${form.urgency === k ? 'text-orange-400' : 'text-gray-400'}`}>{u.mult}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contacts + Insurance */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#FF6B00]" />Contacts & Protection
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Your Phone</label>
                      <input required type="tel" value={form.sender_phone} onChange={e => f('sender_phone', e.target.value)} placeholder="07XX XXX XXX" className={INP} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Receiver Name</label>
                        <input required value={form.receiver_name} onChange={e => f('receiver_name', e.target.value)} placeholder="Full name" className={INP} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Receiver Phone</label>
                        <input required type="tel" value={form.receiver_phone} onChange={e => f('receiver_phone', e.target.value)} placeholder="07XX XXX XXX" className={INP} />
                      </div>
                    </div>
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.insurance ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={form.insurance} onChange={e => f('insurance', e.target.checked)} className="hidden" />
                      <Shield className="w-5 h-5 flex-shrink-0" style={{ color: form.insurance ? '#16a34a' : '#9ca3af' }} />
                      <div>
                        <div className={`text-sm font-semibold ${form.insurance ? 'text-green-700' : 'text-gray-700'}`}>Cargo Insurance</div>
                        <div className="text-xs text-gray-500">Full protection against loss or damage</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.cost_share ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={form.cost_share} onChange={e => f('cost_share', e.target.checked)} className="hidden" />
                      <Users className="w-5 h-5 flex-shrink-0" style={{ color: form.cost_share ? '#2563eb' : '#9ca3af' }} />
                      <div>
                        <div className={`text-sm font-semibold ${form.cost_share ? 'text-blue-700' : 'text-gray-700'}`}>Cost Sharing</div>
                        <div className="text-xs text-gray-500">Split truck costs with other clients on the same route</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />Get AI Quote <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {step === 1 && quote && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#FF6B00] rounded-2xl p-6 text-white shadow-xl shadow-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 opacity-80" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">AI Freight Quote</span>
                  </div>
                  <div className="text-5xl font-black mb-1">KES {quote.total.toLocaleString()}</div>
                  <div className="text-orange-100 text-sm">{form.from} → {form.to} · {form.weight}kg · {URGENCY[form.urgency].label}</div>
                  {form.cost_share && (
                    <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
                      Cost sharing enabled — split with other clients on this route
                    </div>
                  )}
                </div>

                {/* Payment split */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-sm font-bold text-gray-900 mb-3">Payment Schedule (M-Pesa)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-orange-600 font-semibold mb-1">70% Upfront</div>
                      <div className="text-lg font-black text-[#FF6B00]">KES {quote.upfront.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Pay now to confirm</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-gray-600 font-semibold mb-1">30% on Delivery</div>
                      <div className="text-lg font-black text-gray-700">KES {quote.on_delivery.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">After delivery confirmed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Breakdown</div>
                  <div className="space-y-2">
                    {[
                      ['Base fare', quote.base], ['Weight charge', quote.weight],
                      quote.fragile > 0 && ['Fragile handling', quote.fragile],
                      quote.hazardous > 0 && ['Hazardous surcharge', quote.hazardous],
                      ['Fuel surcharge', quote.fuel],
                      quote.insurance > 0 && ['Insurance', quote.insurance],
                      ['Platform fee', quote.platform],
                    ].filter(Boolean).map(([k, v]) => (
                      <div key={k as string} className="flex justify-between text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-900">KES {(v as number).toLocaleString()}</span>
                      </div>
                    ))}
                    {quote.urgencyMult > 1 && (
                      <div className="flex justify-between text-sm text-[#FF6B00] font-semibold">
                        <span>{URGENCY[form.urgency].label} speed</span>
                        <span>×{quote.urgencyMult}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                      <span className="text-gray-500">VAT (16%)</span>
                      <span className="text-gray-900">KES {quote.vat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-black text-base border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total</span>
                      <span className="text-[#FF6B00]">KES {quote.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded-2xl text-sm font-semibold transition-colors">Adjust</button>
                  <button onClick={() => setStep(2)} className="flex-1 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    Pay via M-Pesa <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && quote && (
              <div className="space-y-4 animate-fade-in">
                {/* M-Pesa Payment */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">M-Pesa Payment</div>
                      <div className="text-xs text-gray-500">70% upfront · KES {quote.upfront.toLocaleString()}</div>
                    </div>
                  </div>

                  {paymentStep === 'pending' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">M-Pesa Phone Number</label>
                        <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)}
                          placeholder="07XX XXX XXX" className={INP} />
                        <p className="text-xs text-gray-400 mt-1">You will receive an STK push to confirm payment</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-1.5">
                        {[
                          ['Route', `${form.from} → ${form.to}`],
                          ['Cargo', `${form.description} · ${form.weight}kg`],
                          ['Speed', `${URGENCY[form.urgency].label}`],
                          ['Upfront (70%)', `KES ${quote.upfront.toLocaleString()}`],
                          ['On Delivery (30%)', `KES ${quote.on_delivery.toLocaleString()}`],
                          ['Tracking', code],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-sm">
                            <span className="text-gray-500">{k}</span>
                            <span className={`text-right ${k === 'Tracking' ? 'font-mono text-[#FF6B00]' : 'font-semibold text-gray-900'}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={simulateMpesa} disabled={!mpesaPhone}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                        <DollarSign className="w-4 h-4" />Send M-Pesa STK Push
                      </button>
                    </>
                  )}

                  {paymentStep === 'stk_sent' && (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">STK Push Sent!</h4>
                      <p className="text-sm text-gray-500">Check your phone <strong>{mpesaPhone}</strong> and enter your M-Pesa PIN to complete payment of <strong>KES {quote.upfront.toLocaleString()}</strong></p>
                    </div>
                  )}

                  {paymentStep === 'confirmed' && (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">Payment Confirmed!</h4>
                      <p className="text-sm text-gray-500 mb-4">KES {quote.upfront.toLocaleString()} received via M-Pesa</p>
                      <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">Back</button>
                        <button onClick={confirm} disabled={saving}
                          className="flex-1 py-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" />Confirm Booking</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentStep === 'pending' && (
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-semibold">Back</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-16 animate-slide-up">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-orange-300">
                  <Package className="w-12 h-12 text-[#FF6B00]" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Shipment Booked!</h2>
                <p className="text-gray-500 mb-5">Your cargo is confirmed. Track using this code:</p>
                <div className="inline-block bg-orange-100 border border-orange-300 rounded-xl px-6 py-3 font-mono font-bold text-lg text-[#FF6B00] mb-4">{code}</div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-xs mx-auto mb-8 space-y-2 shadow-sm text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Receiver</span><span className="font-semibold">{form.receiver_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">30% on delivery</span><span className="font-bold text-[#FF6B00]">KES {quote?.on_delivery.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-600 font-semibold">Confirmed</span></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => onNavigate('landing')}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-semibold text-sm hover:border-orange-300 shadow-sm">
                    <Navigation className="w-4 h-4 text-[#FF6B00]" /> Home
                  </button>
                  <button onClick={() => { setStep(0); setPaymentStep('pending'); setForm(p => ({ ...p, from:'', to:'', description:'', receiver_name:'', receiver_phone:'' })); }}
                    className="flex items-center justify-center gap-2 bg-[#FF6B00] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-[#e55f00] transition-colors">
                    Ship Again <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AVAILABLE TRUCKS TAB */}
        {activeTab === 'trucks' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#FF6B00] rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20">
              <h2 className="text-lg font-black mb-1">Available Trucks</h2>
              <p className="text-orange-100 text-sm">Browse trucks ready to haul your cargo. Direct booking with cost sharing.</p>
            </div>

            {DEMO_TRUCKS.map(truck => (
              <div key={truck.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-4 h-4 text-[#FF6B00]" />
                        <span className="font-bold text-gray-900 text-sm">{truck.route_from} → {truck.route_to}</span>
                        {truck.insurance && (
                          <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">INSURED</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{truck.truck_type} · {truck.registration}</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-orange-100 text-[#FF6B00] px-2 py-0.5 rounded-full font-semibold">
                          KES {truck.price_per_kg}/kg
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {truck.available_kg.toLocaleString()}kg available
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Departs {new Date(truck.departure_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-lg font-black text-[#FF6B00]">{truck.cost_share_slots - truck.cost_share_filled} slots</div>
                      <div className="text-xs text-gray-500">cost share left</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedTruck(expandedTruck === truck.id ? null : truck.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#FF6B00] transition-colors">
                      {expandedTruck === truck.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Details
                    </button>
                    <a href={`tel:${truck.driver_phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                      <Phone className="w-3 h-3" />{truck.driver_name}
                    </a>
                    <button onClick={() => { setActiveTab('book'); setForm(p => ({ ...p, from: truck.route_from, to: truck.route_to, cost_share: true })); }}
                      className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6B00] text-white text-xs font-bold rounded-xl hover:bg-[#e55f00] transition-colors">
                      Book This Truck
                    </button>
                  </div>
                </div>

                {expandedTruck === truck.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-2 text-sm animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Driver', truck.driver_name],
                        ['Phone', truck.driver_phone],
                        ['Capacity', `${truck.capacity_kg.toLocaleString()}kg`],
                        ['Available', `${truck.available_kg.toLocaleString()}kg`],
                        ['Truck Type', truck.truck_type],
                        ['Registration', truck.registration],
                        ['Departure', new Date(truck.departure_date).toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })],
                        ['Insurance', truck.insurance ? 'Yes - Cargo insured' : 'No'],
                        ['Cost Share Slots', `${truck.cost_share_slots - truck.cost_share_filled} of ${truck.cost_share_slots} free`],
                        ['Price', `KES ${truck.price_per_kg}/kg`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-xs text-gray-400">{k}</div>
                          <div className="font-semibold text-gray-900">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <div className="text-xs text-gray-500 mb-2">Cost Share Progress ({truck.cost_share_filled}/{truck.cost_share_slots} slots filled)</div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${(truck.cost_share_filled / truck.cost_share_slots) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
              <Truck className="w-8 h-8 text-[#FF6B00] mx-auto mb-2 opacity-60" />
              <p className="text-sm text-gray-600 mb-3">Are you a transporter? List your truck and start earning.</p>
              <button onClick={() => onNavigate('driver')}
                className="px-5 py-2 bg-[#FF6B00] text-white text-sm font-bold rounded-xl hover:bg-[#e55f00] transition-colors">
                Register Your Truck
              </button>
            </div>
          </div>
        )}

        {/* TRACK TAB */}
        {activeTab === 'track' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FF6B00]" />Track Your Shipment
              </h2>
              <div className="flex gap-2">
                <input value={trackCode} onChange={e => setTrackCode(e.target.value)}
                  placeholder="Enter tracking code (e.g. SNG-ABC123-XYZ)"
                  className={`${INP} flex-1`} />
                <button onClick={handleTrack}
                  className="px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl font-bold text-sm hover:bg-[#e55f00] transition-colors whitespace-nowrap">
                  Track
                </button>
              </div>

              {trackResult && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Shipment Found</div>
                      <div className="text-xs text-gray-500">Updated {trackResult.updated}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {[
                      ['Tracking Code', trackCode.toUpperCase()],
                      ['Route', trackResult.route],
                      ['Status', trackResult.status],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}</span>
                        <span className={`font-semibold ${k === 'Status' ? 'text-green-600' : 'text-gray-900'}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trackCode && !trackResult && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-600">No shipment found for this tracking code.</p>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF6B00]" />Recent Notifications
              </h3>
              {[
                { msg: 'Your cargo SNG-A1B2C-XYZ has been picked up from Nairobi.', time: '1h ago', color: 'green' },
                { msg: 'Driver James Mwangi confirmed your booking.', time: '3h ago', color: 'blue' },
                { msg: 'M-Pesa payment of KES 12,540 confirmed.', time: '4h ago', color: 'orange' },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.color === 'green' ? 'bg-green-500' : n.color === 'blue' ? 'bg-blue-500' : 'bg-[#FF6B00]'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{n.msg}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAuth && <Auth modal onClose={() => setShowAuth(false)} />}
    </div>
  );
};
