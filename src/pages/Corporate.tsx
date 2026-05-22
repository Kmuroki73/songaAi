import React, { useState } from 'react';
import {
  Navigation, Briefcase, ArrowLeft, ArrowRight, Sparkles,
  MapPin, Users, Plane, Building2, Car, Utensils, CheckCircle, DollarSign,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Auth } from './Auth';
import type { Page } from './Landing';

type Props = { onNavigate: (page: Page) => void };

type Form = {
  company: string; destination: string; origin: string;
  start_date: string; end_date: string; employee_count: number; purpose: string;
  includes_flights: boolean; includes_hotel: boolean;
  includes_transport: boolean; includes_meals: boolean;
  contact_name: string; contact_email: string; contact_phone: string; notes: string;
};

type Day = { day: number; date: string; title: string; items: { time: string; activity: string }[] };
type Cost = { flights: number; hotel: number; transport: number; meals: number; misc: number; platform: number; per_person: number; total: number };

const INP = "w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-400 outline-none";
const STEPS = ['Trip Info', 'Itinerary', 'Confirm', 'Done'] as const;
const PURPOSES = ['Conference', 'Training', 'Site Visit', 'Client Meeting', 'Team Building', 'Product Launch', 'Other'];
const SERVICES = [
  { k: 'includes_flights', icon: Plane, label: 'Flights' },
  { k: 'includes_hotel', icon: Building2, label: 'Hotel' },
  { k: 'includes_transport', icon: Car, label: 'Ground Transport' },
  { k: 'includes_meals', icon: Utensils, label: 'Meals & Dining' },
];

function genItinerary(f: Form): Day[] {
  const s = new Date(f.start_date), e = new Date(f.end_date);
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(s); d.setDate(s.getDate() + i);
    const dateStr = d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
    if (i === 0) return {
      day: i+1, date: dateStr, title: 'Departure Day',
      items: [
        ...(f.includes_transport ? [{ time:'07:00', activity:'Ground transport to airport' }] : []),
        ...(f.includes_flights ? [{ time:'09:30', activity:`Flight: ${f.origin} → ${f.destination}` }] : []),
        { time:'13:00', activity:'Arrival & check-in' },
        ...(f.includes_meals ? [{ time:'19:30', activity:'Welcome dinner' }] : []),
      ],
    };
    if (i === days - 1) return {
      day: i+1, date: dateStr, title: 'Return Day',
      items: [
        ...(f.includes_meals ? [{ time:'07:30', activity:'Breakfast & checkout' }] : []),
        { time:'09:00', activity:`${f.purpose} closing & wrap-up` },
        ...(f.includes_transport ? [{ time:'12:00', activity:'Transport to airport' }] : []),
        ...(f.includes_flights ? [{ time:'14:30', activity:`Return flight: ${f.destination} → ${f.origin}` }] : []),
      ],
    };
    return {
      day: i+1, date: dateStr, title: `${f.purpose} — Day ${i}`,
      items: [
        ...(f.includes_meals ? [{ time:'08:00', activity:'Breakfast' }] : []),
        { time:'09:00', activity:`Morning ${f.purpose} session` },
        { time:'12:30', activity:'Lunch break' },
        { time:'14:00', activity:`Afternoon ${f.purpose} session` },
        ...(f.includes_transport ? [{ time:'17:30', activity:'Evening city transfer' }] : []),
        ...(f.includes_meals ? [{ time:'19:30', activity:'Team dinner' }] : []),
      ],
    };
  });
}

function calcCost(f: Form): Cost {
  const days = Math.max(1, Math.round((new Date(f.end_date).getTime() - new Date(f.start_date).getTime()) / 86400000) + 1);
  const flights = f.includes_flights ? 18500 : 0;
  const hotel = f.includes_hotel ? 7000 * days : 0;
  const transport = f.includes_transport ? 2800 * days : 0;
  const meals = f.includes_meals ? 3500 * days : 0;
  const misc = 1200 * days;
  const platform = 3000;
  const per_person = flights + hotel + transport + meals + misc + platform;
  return { flights, hotel, transport, meals, misc, platform, per_person, total: per_person * f.employee_count };
}

export const Corporate: React.FC<Props> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    company: '', destination: '', origin: 'Nairobi',
    start_date: '', end_date: '', employee_count: 5, purpose: 'Conference',
    includes_flights: true, includes_hotel: true, includes_transport: true, includes_meals: true,
    contact_name: profile?.full_name ?? '', contact_email: '', contact_phone: profile?.phone ?? '', notes: '',
  });
  const [itinerary, setItinerary] = useState<Day[]>([]);
  const [cost, setCost] = useState<Cost | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);

  const f = (k: keyof Form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const generate = (e: React.FormEvent) => { e.preventDefault(); setItinerary(genItinerary(form)); setCost(calcCost(form)); setStep(1); };

  const submit = async () => {
    if (!user) { setShowAuth(true); return; }
    setSaving(true);
    await supabase.from('corporate_bookings').insert({
      requester_id: user.id, company_name: form.company,
      destination: form.destination, origin: form.origin,
      travel_date: new Date(form.start_date).toISOString(),
      return_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      employee_count: form.employee_count, travel_purpose: form.purpose,
      includes_flights: form.includes_flights, includes_hotel: form.includes_hotel,
      includes_transport: form.includes_transport,
      itinerary: { days: itinerary, cost, meta: { contact_name: form.contact_name, contact_email: form.contact_email, contact_phone: form.contact_phone, includes_meals: form.includes_meals } },
      budget_kes: cost?.total, total_cost: cost?.total,
      notes: form.notes, status: 'pending',
    });
    setSaving(false);
    setStep(3);
  };

  const StepBar = () => (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === i ? 'text-[#FF6B00]' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black border-2 ${step === i ? 'bg-[#FF6B00] border-[#FF6B00] text-white' : i < step ? 'bg-green-100 border-green-500 text-green-600' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('landing')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center ml-1"><Briefcase className="w-4 h-4 text-white" /></div>
            <div className="ml-1"><div className="text-sm font-black text-gray-900 leading-none">Corporate Travel</div><div className="text-xs text-gray-500">AI-powered enterprise itineraries</div></div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-[#FF6B00] rounded-md flex items-center justify-center"><Navigation className="w-3.5 h-3.5 text-white" /></div>
            <span className="text-xs font-black text-gray-900">Songa AI</span>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3 pt-1">
          <StepBar />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {step === 0 && (
          <form onSubmit={generate} className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#FF6B00]" />Company & Purpose</h2>
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company Name</label>
                  <input required value={form.company} onChange={e => f('company', e.target.value)} placeholder="Your company name" className={INP} /></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Trip Purpose</label>
                  <div className="flex flex-wrap gap-2">
                    {PURPOSES.map(p => (
                      <button key={p} type="button" onClick={() => f('purpose', p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${form.purpose === p ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#FF6B00]" />Route & Dates</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                    <input required value={form.origin} onChange={e => f('origin', e.target.value)} placeholder="e.g. Nairobi" className={INP} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Destination</label>
                    <input required value={form.destination} onChange={e => f('destination', e.target.value)} placeholder="e.g. Kigali" className={INP} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Departure</label>
                    <input required type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} className={INP} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Return</label>
                    <input required type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} className={INP} /></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#FF6B00]" />Team Size</h2>
              <div className="flex items-center gap-3 mb-3">
                <button type="button" onClick={() => f('employee_count', Math.max(1, form.employee_count - 1))} className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors">−</button>
                <div className="flex-1 text-center"><div className="text-3xl font-black text-[#FF6B00]">{form.employee_count}</div><div className="text-xs text-gray-500">employee{form.employee_count !== 1 ? 's' : ''}</div></div>
                <button type="button" onClick={() => f('employee_count', form.employee_count + 1)} className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors">+</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[2,5,10,15,20,50].map(n => (
                  <button key={n} type="button" onClick={() => f('employee_count', n)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${form.employee_count === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}>{n}</button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Services Included</h2>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(({ k, icon: Icon, label }) => (
                  <label key={k} className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${(form as any)[k] ? 'border-[#FF6B00] bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <input type="checkbox" checked={(form as any)[k]} onChange={e => f(k as keyof Form, e.target.checked)} className="hidden" />
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: (form as any)[k] ? '#FF6B00' : '#9ca3af' }} />
                    <span className="text-sm font-medium" style={{ color: (form as any)[k] ? '#FF6B00' : '#6b7280' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Contact Info</h2>
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Your Name</label>
                  <input required value={form.contact_name} onChange={e => f('contact_name', e.target.value)} placeholder="Full name" className={INP} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input required type="email" value={form.contact_email} onChange={e => f('contact_email', e.target.value)} placeholder="you@company.com" className={INP} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                    <input required type="tel" value={form.contact_phone} onChange={e => f('contact_phone', e.target.value)} placeholder="07XX XXX XXX" className={INP} /></div>
                </div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Special requirements, dietary needs..." rows={2}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" /></div>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />Generate AI Itinerary <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 1 && cost && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#FF6B00] rounded-2xl p-6 text-white shadow-xl shadow-orange-500/20">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 opacity-80" /><span className="text-xs font-bold uppercase tracking-wider opacity-80">AI Itinerary Ready</span></div>
              <div className="text-4xl font-black mb-1">KES {cost.total.toLocaleString()}</div>
              <div className="text-orange-100 text-sm">{form.employee_count} employees · {form.origin} → {form.destination} · {itinerary.length} days</div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cost Per Person — KES {cost.per_person.toLocaleString()}</div>
              <div className="space-y-2">
                {[
                  cost.flights > 0 && ['Flights', cost.flights, Plane],
                  cost.hotel > 0 && ['Hotel', cost.hotel, Building2],
                  cost.transport > 0 && ['Transport', cost.transport, Car],
                  cost.meals > 0 && ['Meals', cost.meals, Utensils],
                  ['Miscellaneous', cost.misc, DollarSign],
                  ['Platform fee', cost.platform, DollarSign],
                ].filter(Boolean).map((row: any) => {
                  const [k, v, Icon] = row;
                  return (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-500">{k}</span></div>
                      <span className="text-gray-900">KES {v.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-black text-base border-t border-gray-200 pt-2"><span className="text-gray-900">Total ({form.employee_count} pax)</span><span className="text-[#FF6B00]">KES {cost.total.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Day-by-Day Plan</div>
              {itinerary.map(day => (
                <div key={day.day} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <div><div className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">Day {day.day}</div><div className="text-sm font-bold text-gray-900">{day.title}</div></div>
                    <span className="text-xs text-gray-400">{day.date}</span>
                  </div>
                  <div className="space-y-1.5">
                    {day.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="text-xs font-mono text-[#FF6B00] w-11 flex-shrink-0 mt-0.5">{item.time}</span>
                        <span className="text-xs text-gray-500 leading-relaxed">{item.activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 rounded-2xl text-sm font-semibold transition-colors">Adjust</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">Confirm <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {step === 2 && cost && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-2.5">
              <div className="text-sm font-bold text-gray-900 mb-3">Confirm Corporate Trip</div>
              {[
                ['Company', form.company], ['Route', `${form.origin} → ${form.destination}`],
                ['Dates', `${new Date(form.start_date).toLocaleDateString('en-KE',{month:'short',day:'numeric'})} – ${new Date(form.end_date).toLocaleDateString('en-KE',{month:'short',day:'numeric',year:'numeric'})}`],
                ['Team', `${form.employee_count} employees`], ['Purpose', form.purpose],
                ['Contact', `${form.contact_name} · ${form.contact_phone}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500">{k}</span><span className="text-gray-900 text-right font-semibold">{v}</span>
                </div>
              ))}
              <div className="flex justify-between font-black text-base border-t border-gray-200 pt-3"><span className="text-gray-900">Total Budget</span><span className="text-[#FF6B00]">KES {cost.total.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 rounded-2xl text-sm font-semibold transition-colors">Back</button>
              <button onClick={submit} disabled={saving} className="flex-1 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Submit Request</span><CheckCircle className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-16 animate-slide-up">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-orange-300">
              <Briefcase className="w-12 h-12 text-[#FF6B00]" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Trip Request Submitted!</h2>
            <p className="text-gray-500 mb-10 max-w-sm mx-auto">Our enterprise team will reach out within 24 hours to finalize arrangements and confirm your itinerary.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => onNavigate('landing')} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-semibold text-sm hover:border-orange-300 shadow-sm">
                <Navigation className="w-4 h-4 text-[#FF6B00]" /> Home
              </button>
              <button onClick={() => { setStep(0); setForm(p => ({ ...p, company:'', destination:'', notes:'' })); }}
                className="flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white px-6 py-3 rounded-2xl font-bold text-sm transition-colors">
                Plan Another <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {showAuth && <Auth modal onClose={() => setShowAuth(false)} />}
    </div>
  );
};
