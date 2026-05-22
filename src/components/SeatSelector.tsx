import React, { useEffect, useState } from 'react';
import { supabase, Vehicle, getPassengerSeats } from '../lib/supabase';

type Props = {
  vehicle: Pick<Vehicle, 'id' | 'seat_count' | 'vehicle_type'>;
  onSeatSelect: (seatNumber: number) => void;
  selectedSeat: number | null;
};

type SeatStatus = 'available' | 'booked' | 'selected';

function buildRows(total: number): (number | 'driver' | 'gap' | 'empty')[][] {
  if (total <= 4) {
    const rows: (number | 'driver' | 'gap' | 'empty')[][] = [
      ['empty', 1, 'gap', 'driver'],
    ];
    let seat = 2;
    while (seat <= total) {
      const row: (number | 'driver' | 'gap' | 'empty')[] = ['gap'];
      row.push(seat <= total ? seat++ : 'empty');
      if (seat <= total) row.push(seat++);
      rows.push(row);
    }
    return rows;
  }

  if (total <= 8) {
    const rows: (number | 'driver' | 'gap' | 'empty')[][] = [[1, 'gap', 'driver']];
    let seat = 2;
    while (seat <= total) {
      const row: (number | 'driver' | 'gap' | 'empty')[] = [];
      row.push(seat <= total ? seat++ : 'empty');
      if (seat <= total) row.push(seat++);
      rows.push(row);
    }
    return rows;
  }

  // Matatu 3-per-row
  const rows: (number | 'driver' | 'gap' | 'empty')[][] = [[2, 1, 'gap', 'driver']];
  let seat = 3;
  while (seat <= total) {
    const a: number | 'empty' = seat <= total ? seat++ : 'empty';
    const b: number | 'empty' = seat <= total ? seat++ : 'empty';
    const c: number | 'empty' = seat <= total ? seat++ : 'empty';
    rows.push([c, b, 'gap', a]);
  }
  return rows;
}

export const SeatSelector: React.FC<Props> = ({ vehicle, onSeatSelect, selectedSeat }) => {
  const totalSeats = getPassengerSeats(vehicle);
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);

  useEffect(() => {
    fetchBooked();
    const sub = supabase
      .channel(`seats-${vehicle.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `vehicle_id=eq.${vehicle.id}` }, fetchBooked)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [vehicle.id]);

  const fetchBooked = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('seat_number')
      .eq('vehicle_id', vehicle.id)
      .eq('payment_status', 'completed');
    if (data) setBookedSeats(data.map(b => b.seat_number));
  };

  const getStatus = (seat: number): SeatStatus => {
    if (seat === selectedSeat) return 'selected';
    if (bookedSeats.includes(seat)) return 'booked';
    return 'available';
  };

  const available = totalSeats - bookedSeats.length;
  const rows = buildRows(totalSeats);

  const SeatBtn = ({ seat }: { seat: number }) => {
    const status = getStatus(seat);
    return (
      <button
        onClick={() => status !== 'booked' && onSeatSelect(seat)}
        disabled={status === 'booked'}
        className={`w-10 h-10 rounded-lg text-xs font-bold border-2 transition-all duration-150 flex items-center justify-center
          ${status === 'selected'
            ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/30 scale-110'
            : status === 'booked'
            ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
            : 'bg-white/10 border-orange-500/40 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400 hover:text-white hover:scale-105'
          }`}
      >
        {seat}
      </button>
    );
  };

  const DriverSeat = () => (
    <div className="w-10 h-10 rounded-lg bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center" title="Driver">
      <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="7" r="3" />
        <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      </svg>
    </div>
  );

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{totalSeats}-Seat Vehicle</div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          available === 0 ? 'bg-red-500/15 text-red-400' : available <= 3 ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-500/10 text-orange-300'
        }`}>
          {available === 0 ? 'Full' : `${available} / ${totalSeats} free`}
        </div>
      </div>

      <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-5">
        <div className="text-center mb-3">
          <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Front</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center justify-center gap-2">
              {row.map((cell, ci) => {
                if (cell === 'driver') return <DriverSeat key={ci} />;
                if (cell === 'gap') return <div key={ci} className="w-3" />;
                if (cell === 'empty') return <div key={ci} className="w-10 h-10" />;
                return <SeatBtn key={ci} seat={cell as number} />;
              })}
            </div>
          ))}
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Back</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 mt-4 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-white/10 border-2 border-orange-500/40" /><span>Free</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-orange-500 border-2 border-orange-400" /><span>Yours</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-white/5 border-2 border-white/10" /><span>Taken</span></div>
      </div>
    </div>
  );
};
