import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, ArrowLeft, Plane, Car, Package, Utensils,
  MapPin, Compass, Phone, ExternalLink, Clock, ChevronRight,
  RotateCcw, Zap,
} from 'lucide-react';
import {
  parseQuery, fetchResults, buildAIResponse,
  TravelResult, TravelIntent, ParsedQuery,
} from '../lib/songaAI';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  results?: TravelResult[];
  query?: ParsedQuery;
}

interface SongaAIProps {
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'Find me a ride from Meru to Nairobi tonight',
  'Show flights from Nairobi to Mombasa tomorrow',
  'Cargo transport from Nairobi to Kisumu',
  'Find the cheapest trip available today',
  'Book a tour to Masai Mara this weekend',
  'Uber from Westlands to JKIA',
];

const INTENT_CONFIG: Record<TravelIntent, { icon: React.FC<{ className?: string }>; label: string; accent: string }> = {
  songa_ride: { icon: Car,     label: 'Songa Ride',    accent: 'text-orange-400' },
  flight:     { icon: Plane,   label: 'Flight',        accent: 'text-sky-400'    },
  cargo:      { icon: Package, label: 'Cargo',         accent: 'text-amber-400'  },
  tour:       { icon: Compass, label: 'Tour',          accent: 'text-emerald-400'},
  food_delivery: { icon: Utensils, label: 'Food',      accent: 'text-rose-400'   },
  ride_hailing:  { icon: Car,   label: 'Ride',         accent: 'text-blue-400'   },
  unknown:    { icon: MapPin,  label: 'Travel',        accent: 'text-gray-400'   },
};

const PROVIDER_PILL: Record<string, string> = {
  Songa:           'bg-orange-500 text-white',
  'Songa Cargo':   'bg-orange-600 text-white',
  Uber:            'bg-white text-gray-900',
  Bolt:            'bg-green-500 text-white',
  'Kenya Airways': 'bg-red-700 text-white',
  Jambojet:        'bg-orange-400 text-white',
  Safarilink:      'bg-blue-600 text-white',
  Generic:         'bg-gray-600 text-gray-100',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  const cls = PROVIDER_PILL[provider] ?? 'bg-gray-600 text-gray-100';
  return (
    <span className={`inline-block ${cls} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
      {provider}
    </span>
  );
}

function AvailabilityDot({ status }: { status: TravelResult['availability'] }) {
  const dot: Record<string, string> = {
    available: 'bg-emerald-400', limited: 'bg-amber-400',
    full: 'bg-red-400', pending: 'bg-gray-500',
  };
  const label: Record<string, string> = {
    available: 'Available', limited: 'Limited', full: 'Full', pending: 'Pending',
  };
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-gray-500'}`} />
      {label[status]}
    </span>
  );
}

function ResultCard({ result, index }: { result: TravelResult; index: number }) {
  const cfg = INTENT_CONFIG[result.type] ?? INTENT_CONFIG.unknown;
  const Icon = cfg.icon;

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 ${
        result.isSongaPriority
          ? 'bg-[#1e1a14] border border-orange-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.15),0_4px_20px_rgba(249,115,22,0.1)]'
          : 'bg-[#161b22] border border-white/5'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {result.isSongaPriority && (
        <div className="absolute -top-2.5 left-4">
          <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <Zap className="w-2.5 h-2.5" /> Best on Songa
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mt-1">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            result.isSongaPriority ? 'bg-orange-500/15' : 'bg-white/5'
          }`}>
            <Icon className={`w-4 h-4 ${cfg.accent}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ProviderBadge provider={result.provider} />
              <AvailabilityDot status={result.availability} />
            </div>
            <p className="text-sm font-semibold text-white mt-1 truncate">
              {result.from} → {result.to}
            </p>
            {result.description && (
              <p className="text-xs text-gray-400 mt-0.5">{result.description}</p>
            )}
            {result.departureTime && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {result.departureTime}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-lg font-bold text-white">
            KES {result.price.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {result.phone && (
          <a
            href={`tel:${result.phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 font-semibold text-xs py-2 rounded-xl transition-colors border border-orange-500/20"
          >
            <Phone className="w-3.5 h-3.5" />
            Call to Book
          </a>
        )}
        {result.bookingUrl && (
          <a
            href={result.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs py-2 rounded-xl transition-colors"
          >
            Book Now <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {!result.phone && !result.bookingUrl && (
          <button className="flex-1 flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-2 rounded-xl transition-colors">
            Book <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[#161b22] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const cfg = msg.query ? INTENT_CONFIG[msg.query.intent] : null;
  const IntentIcon = cfg?.icon;

  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[85%] space-y-3">
        <div className="bg-[#161b22] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
          {cfg && IntentIcon && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-1">
              <IntentIcon className={`w-3 h-3 ${cfg.accent}`} />
              {cfg.label} search
            </span>
          )}
          <p className="text-sm text-gray-200 leading-relaxed">{msg.text}</p>
        </div>
        {msg.results && msg.results.length > 0 && (
          <div className="space-y-2.5">
            {msg.results.map((r, i) => (
              <ResultCard key={r.id} result={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] bg-orange-500 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md">
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const SongaAI: React.FC<SongaAIProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Jambo! I'm Songa AI — your African mobility assistant. Ask me to find rides, flights, cargo services, tours, or food delivery anywhere across Kenya and beyond.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  async function handleSend(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || isThinking) return;

    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    const query = parseQuery(prompt);
    const results = await fetchResults(query);
    const aiText = buildAIResponse(query, results.length);

    const sortedResults = [
      ...results.filter(r => r.isSongaPriority),
      ...results.filter(r => !r.isSongaPriority),
    ];

    setIsThinking(false);
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: aiText,
      results: sortedResults,
      query,
    }]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: "Jambo! I'm Songa AI — your African mobility assistant. Ask me to find rides, flights, cargo services, tours, or food delivery anywhere across Kenya and beyond.",
    }]);
    setInput('');
    inputRef.current?.focus();
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/5" style={{ background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white/8 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">Songa AI</h1>
              <p className="text-[11px] text-orange-400 font-medium">African Mobility Assistant</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Online
            </div>
            <button
              onClick={handleReset}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-white/8 hover:text-gray-300 transition-colors"
              title="New conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

          {messages.map(msg =>
            msg.role === 'user'
              ? <UserMessage key={msg.id} text={msg.text} />
              : <AssistantMessage key={msg.id} msg={msg} />
          )}

          {isThinking && <TypingIndicator />}

          {/* Suggested prompts */}
          {showSuggestions && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1">Try asking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="text-left text-sm text-gray-300 bg-[#161b22] border border-white/5 rounded-xl px-3.5 py-2.5 hover:border-orange-500/40 hover:bg-orange-500/8 hover:text-orange-300 transition-all leading-snug"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="sticky bottom-0 border-t border-white/5" style={{ background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* Capability chips */}
          <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
            {(Object.entries(INTENT_CONFIG) as [TravelIntent, typeof INTENT_CONFIG[TravelIntent]][])
              .filter(([k]) => k !== 'unknown')
              .map(([key, cfg]) => {
                const Icon = cfg.icon;
                const examples: Record<TravelIntent, string> = {
                  songa_ride:   'Find a Songa ride from Meru to Nairobi today',
                  flight:       'Show flights from Nairobi to Mombasa tomorrow',
                  cargo:        'Cargo from Nairobi to Kisumu this week',
                  tour:         'Book a tour to Masai Mara',
                  food_delivery:'Order food near me',
                  ride_hailing: 'Uber from Westlands to JKIA',
                  unknown:      '',
                };
                return (
                  <button
                    key={key}
                    onClick={() => { setInput(examples[key]); inputRef.current?.focus(); }}
                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-white/5 hover:bg-orange-500/15 hover:text-orange-400 border border-white/8 hover:border-orange-500/30 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0"
                  >
                    <Icon className={`w-3 h-3 ${cfg.accent}`} />
                    {cfg.label}
                  </button>
                );
              })}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 bg-[#161b22] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-orange-500/50 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about rides, flights, cargo, tours..."
                className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none outline-none leading-relaxed"
                style={{ maxHeight: 120 }}
                disabled={isThinking}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isThinking}
              className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-white/8 disabled:text-gray-600 text-white flex items-center justify-center transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 disabled:shadow-none flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-700 mt-2">
            Songa AI · Powered by Songa Ride Ltd · Results may vary
          </p>
        </div>
      </div>
    </div>
  );
};
