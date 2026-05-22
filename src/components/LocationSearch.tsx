import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Loader, Navigation } from 'lucide-react';
import { searchPlaces, NominatimResult, reverseGeocode } from '../lib/maps';

type Props = {
  value: string;
  lat: number | null;
  lng: number | null;
  onChange: (location: string, lat: number, lng: number) => void;
  placeholder?: string;
};

export const LocationSearch: React.FC<Props> = ({
  value,
  lat,
  lng,
  onChange,
  placeholder = 'Search for your pickup point…',
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 3) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const data = await searchPlaces(v);
      setResults(data);
      setOpen(data.length > 0);
      setSearching(false);
    }, 400);
  };

  const handleSelect = (r: NominatimResult) => {
    const short = r.display_name.split(',').slice(0, 3).join(', ');
    setQuery(short);
    setOpen(false);
    onChange(short, parseFloat(r.lat), parseFloat(r.lon));
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        const short = name.split(',').slice(0, 3).join(', ');
        setQuery(short);
        onChange(short, latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 transition-colors ${
        lat ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white focus-within:border-orange-400'
      }`}>
        <MapPin className={`w-4 h-4 flex-shrink-0 ${lat ? 'text-emerald-500' : 'text-gray-400'}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-800"
        />
        {searching ? (
          <Loader className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
        ) : (
          <button
            type="button"
            onClick={handleGPS}
            disabled={locating}
            title="Use my current location"
            className="flex-shrink-0 p-1 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50"
          >
            {locating
              ? <Loader className="w-4 h-4 animate-spin" />
              : <Navigation className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          {results.map((r) => {
            const parts = r.display_name.split(', ');
            const primary = parts.slice(0, 2).join(', ');
            const secondary = parts.slice(2, 5).join(', ');
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{primary}</div>
                  {secondary && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{secondary}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Confirmed location pill */}
      {lat && lng && (
        <div className="flex items-center gap-1.5 mt-1.5 px-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
          <span className="text-xs text-emerald-600 font-medium">
            Location confirmed · {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
};
