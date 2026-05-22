import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation, Sparkles, Package, Briefcase, ArrowRight, ChevronRight,
  Shield, Zap, Users, Clock, TrendingUp, MapPin, Star, Building2,
  Plane, Car, Truck, Menu, X,
} from 'lucide-react';
import { Auth } from './Auth';
import { Footer } from '../components/Footer';

export type Page = 'landing' | 'passenger' | 'driver' | 'cargo' | 'corporate' | 'ai';
type Props = { onNavigate: (page: Page) => void };

const CITIES: [number, number, string][] = [
  [32, 55, 'Nairobi'], [24, 37, 'Kampala'], [48, 67, 'Dar es Salaam'],
  [18, 22, 'Addis'], [56, 42, 'Mombasa'], [28, 62, 'Kigali'],
  [36, 50, 'Kisumu'], [42, 58, 'Arusha'], [26, 47, 'Nakuru'], [37, 44, 'Eldoret'],
];
const CONNECTIONS = [[0,1],[0,4],[0,5],[0,6],[1,2],[1,5],[2,7],[0,8],[0,9],[3,0],[6,9]];

const SERVICES = [
  { id: 'passenger', icon: Car, color: '#FF6B00', title: 'Carpooling', badge: 'LIVE', desc: 'Real-time matatu & carpool bookings. Pick your seat, track live, arrive safely.' },
  { id: 'cargo', icon: Truck, color: '#FF6B00', title: 'Cargo & Freight', badge: 'AI PRICED', desc: 'AI freight pricing across 40+ routes. Full weight/distance/customs calculation with M-Pesa payment.' },
  { id: 'corporate', icon: Briefcase, color: '#FF6B00', title: 'Corporate Travel', badge: 'ENTERPRISE', desc: 'AI itinerary generation, employee travel management, approvals & expense control.' },
  { id: 'ai', icon: Sparkles, color: '#FF6B00', title: 'Songa Copilot', badge: 'AI', desc: 'Ask anything in natural language. Book rides, find cargo routes, plan trips instantly.' },
];

const STATS = [
  { v: '50K+', l: 'Rides Booked' }, { v: '4.9★', l: 'Avg. Rating' },
  { v: '200+', l: 'Active Drivers' }, { v: '40+', l: 'Cities Covered' },
];

export const Landing: React.FC<Props> = ({ onNavigate }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dots, setDots] = useState<{ x: number; y: number; from: number; to: number; p: number }[]>([]);
  const raf = useRef<number>();
  const last = useRef(performance.now());

  useEffect(() => {
    setDots(CONNECTIONS.slice(0, 5).map((c, i) => ({
      x: CITIES[c[0]][0], y: CITIES[c[0]][1], from: c[0], to: c[1], p: i * 0.2,
    })));
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setDots(prev => prev.map(d => {
        const p = (d.p + dt * 0.18) % 1;
        const f = CITIES[d.from], t = CITIES[d.to];
        return { ...d, p, x: f[0] + (t[0] - f[0]) * p, y: f[1] + (t[1] - f[1]) * p };
      }));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight">Songa <span className="text-[#FF6B00]">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Carpooling', page: 'passenger' },
              { label: 'Cargo', page: 'cargo' },
              { label: 'Corporate', page: 'corporate' },
            ].map(({ label, page }) => (
              <button key={label} onClick={() => onNavigate(page as Page)}
                className="text-sm font-medium text-gray-600 hover:text-[#FF6B00] px-4 py-2 rounded-xl hover:bg-orange-50 transition-all">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAuth(true)} className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors">
              Sign in
            </button>
            <button onClick={() => onNavigate('passenger')} className="text-sm font-bold text-white bg-[#FF6B00] hover:bg-[#e55f00] px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 hover:scale-[1.02]">
              Get Started
            </button>
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
            {[
              { label: 'Carpooling', page: 'passenger' },
              { label: 'Cargo', page: 'cargo' },
              { label: 'Corporate', page: 'corporate' },
              { label: 'Songa AI', page: 'ai' },
            ].map(({ label, page }) => (
              <button key={label} onClick={() => { onNavigate(page as Page); setMobileMenu(false); }}
                className="w-full text-left text-sm font-medium text-gray-700 hover:text-[#FF6B00] px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-all">
                {label}
              </button>
            ))}
            <button onClick={() => { setShowAuth(true); setMobileMenu(false); }}
              className="w-full text-left text-sm font-medium text-gray-700 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all">
              Sign In
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="absolute inset-0 pointer-events-none">
          <svg viewBox="0 0 80 90" className="absolute right-0 top-0 h-full w-full max-w-3xl opacity-[0.08] sm:opacity-[0.12]" preserveAspectRatio="xMidYMid slice">
            {CONNECTIONS.map(([a, b], i) => (
              <line key={i} x1={CITIES[a][0]} y1={CITIES[a][1]} x2={CITIES[b][0]} y2={CITIES[b][1]}
                stroke="#FF6B00" strokeWidth="0.5" strokeDasharray="1 2" opacity="0.7" />
            ))}
            {CITIES.map(([x, y, name], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="1.2" fill="#FF6B00" opacity="0.8" />
                <circle cx={x} cy={y} r="3" fill="none" stroke="#FF6B00" strokeWidth="0.3" opacity="0.3" />
                <text x={x + 1.5} y={y - 1} fontSize="2.5" fill="#666" fontFamily="Inter, sans-serif" fontWeight="500">{name}</text>
              </g>
            ))}
            {dots.map((d, i) => (
              <g key={i}>
                <circle cx={d.x} cy={d.y} r="1.8" fill="#FF6B00" opacity="0.9" />
                <circle cx={d.x} cy={d.y} r="4" fill="none" stroke="#FF6B00" strokeWidth="0.4" opacity="0.35" />
              </g>
            ))}
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 bg-[#FF6B00] rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-[#FF6B00] tracking-wide">Africa's AI Mobility Operating System</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tighter mb-8">
              <span className="text-gray-900 block">Move smarter.</span>
              <span className="text-[#FF6B00] block mt-2">Ship faster.</span>
              <span className="text-gray-900 block mt-2">Travel further.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-xl">
              Songa AI connects people, cargo, corporate travel, and public transport into one intelligent real-time platform. Built for Africa.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <button onClick={() => onNavigate('passenger')}
                className="flex items-center gap-2.5 bg-[#FF6B00] hover:bg-[#e55f00] text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02]">
                Find a Ride <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigate('cargo')}
                className="flex items-center gap-2.5 bg-white border-2 border-[#FF6B00] text-[#FF6B00] px-7 py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-50 transition-all shadow-sm">
                <Truck className="w-4 h-4" /> Ship Cargo
              </button>
              <button onClick={() => onNavigate('ai')}
                className="flex items-center gap-2.5 bg-white border border-gray-200 text-gray-700 px-7 py-3.5 rounded-2xl font-semibold text-sm hover:border-orange-300 hover:text-[#FF6B00] transition-all shadow-sm">
                <Sparkles className="w-4 h-4 text-[#FF6B00]" /> Ask Songa AI
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-[#FF6B00] font-semibold">
                <span className="w-2 h-2 bg-[#FF6B00] rounded-full animate-pulse" />
                Live right now:
              </span>
              {['Meru → Nairobi 3 seats left', 'Kampala → Kigali cargo matched', 'Corporate team 12 pax booked'].map((t, i) => (
                <span key={i} className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#FF6B00]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map(({ v, l }) => (
              <div key={l} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white mb-1">{v}</div>
                <div className="text-sm text-orange-100 font-medium">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">One platform. Every journey.</h2>
          <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">From booking a matatu seat to managing enterprise cargo at scale — Songa does it all.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map(svc => {
            const Icon = svc.icon;
            return (
              <div key={svc.id} onClick={() => onNavigate(svc.id as Page)}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 transition-all group cursor-pointer hover:-translate-y-1 duration-200 shadow-sm">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-100 border border-orange-200">
                    <Icon className="w-6 h-6 text-[#FF6B00]" />
                  </div>
                  <span className="text-[10px] font-black px-2 py-1 rounded-full bg-orange-100 text-[#FF6B00] border border-orange-200">
                    {svc.badge}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 mb-2">{svc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{svc.desc}</p>
                <div className="flex items-center gap-1 text-xs font-semibold text-[#FF6B00] group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Songa */}
      <section className="bg-gray-50 border-y border-gray-100 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
                Built for Africa.<br />
                <span className="text-[#FF6B00]">Powered by AI.</span>
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed">The infrastructure layer for African mobility — connecting passengers, drivers, cargo owners, fleet operators, and corporations into one intelligent network.</p>
              <div className="space-y-5">
                {[
                  { icon: Zap, title: 'Real-time everything', desc: 'Live seat availability, cargo tracking, and driver locations — updated every second.' },
                  { icon: Shield, title: 'Verified & trusted', desc: 'Driver KYC, vehicle checks, and secure M-Pesa payments built in.' },
                  { icon: TrendingUp, title: 'AI-optimized pricing', desc: 'Dynamic cargo quotes based on weight, distance, border fees, and market demand.' },
                  { icon: MapPin, title: 'Precise pickup', desc: 'GPS-powered door-to-door coordination across East Africa.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-100">
                      <Icon className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 mb-0.5">{title}</div>
                      <div className="text-sm text-gray-500 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Live activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm font-bold text-gray-900">Live Activity</div>
                <div className="flex items-center gap-1.5 text-xs text-[#FF6B00] font-semibold">
                  <span className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full animate-pulse" />Live
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Meru → Nairobi', sub: '3 seats booked', time: '2m ago', icon: Car },
                  { label: 'Cargo: Nairobi → Kampala', sub: '500kg matched', time: '4m ago', icon: Truck },
                  { label: 'Corporate: 8 pax → Mombasa', sub: 'Itinerary generated', time: '7m ago', icon: Briefcase },
                  { label: 'Kisumu → Eldoret', sub: '2 seats left', time: '9m ago', icon: Car },
                  { label: 'JKIA → Westlands pickup', sub: 'Driver assigned', time: '12m ago', icon: Plane },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100">
                          <Icon className="w-4 h-4 text-[#FF6B00]" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.sub}</div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{item.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Driver CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="relative overflow-hidden bg-[#FF6B00] rounded-3xl p-10 sm:p-16 text-center shadow-2xl shadow-orange-500/20">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 0%, transparent 60%)' }} />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/30">
              <Navigation className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">Drive with Songa</h2>
            <p className="text-orange-100 max-w-md mx-auto mb-8 leading-relaxed">List your vehicle, set your route, go live. Passengers book directly — no commission cuts, no middlemen.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 bg-white text-[#FF6B00] px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-all">
                Register as Driver <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigate('driver')}
                className="flex items-center gap-2 bg-white/15 border border-white/30 text-white px-8 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/25 transition-all">
                <Building2 className="w-4 h-4" /> Driver Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Cargo CTA section */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Truck, title: 'Cargo Shipping', desc: 'Small parcels to full truckloads. Cost-sharing model splits expenses between clients.', page: 'cargo' as Page, badge: 'AI PRICED' },
              { icon: Users, title: 'Cost Sharing', desc: 'Multiple clients sharing one truck — automatic cost split, smart routing, real savings.', page: 'cargo' as Page, badge: 'SMART' },
              { icon: Shield, title: 'Cargo Insurance', desc: 'Full protection against loss or damage. Insure your shipment in one click.', page: 'cargo' as Page, badge: 'PROTECTED' },
            ].map(({ icon: Icon, title, desc, page, badge }) => (
              <div key={title} onClick={() => onNavigate(page)}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/8 transition-all cursor-pointer group shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <span className="text-[10px] font-black bg-orange-100 text-[#FF6B00] px-2 py-1 rounded-full">{badge}</span>
                </div>
                <h3 className="font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      {showAuth && <Auth modal onClose={() => setShowAuth(false)} />}
    </div>
  );
};
