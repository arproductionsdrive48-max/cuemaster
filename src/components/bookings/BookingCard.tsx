import React from 'react';
import { Booking, TablePricing } from '@/types';
import { Calendar, Clock, MapPin, IndianRupee, MessageCircle, CheckCircle, XCircle, User, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ConfirmationActions from './ConfirmationActions';

interface BookingCardProps {
  booking: Booking;
  tablePricing: TablePricing;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onRemind: (booking: Booking) => void;
  onAddNote: (id: string, note: string | null) => void;
  isOnline: boolean;
}

const statusConfig = {
  confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Confirmed' },
  pending: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Pending' },
  cancelled: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Cancelled' },
  waitlisted: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Waitlist' }
};

const BookingCard: React.FC<BookingCardProps> = ({ booking, tablePricing, onConfirm, onCancel, onRemind, onAddNote, isOnline }) => {
  const config = statusConfig[booking.status];

  // Helper to calculate approx cost if hourly
  let estCostDisplay = null;
  if (booking.startTime && booking.endTime) {
    const [sH, sM] = booking.startTime.split(':').map(Number);
    const [eH, eM] = booking.endTime.split(':').map(Number);
    let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMins < 0) diffMins += 24 * 60; // Rollover
    if (diffMins > 0) {
      const estimatedCost = (diffMins / 60) * tablePricing.perHour;
      estCostDisplay = Math.round(estimatedCost);
    }
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#333] hover:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row transition-all duration-300 animate-fade-in-up">
      
      {/* Left indicator strip - Desktop only */}
      <div className={cn("hidden md:block w-1.5", 
        booking.status === 'confirmed' ? "bg-emerald-500" :
        booking.status === 'waitlisted' ? "bg-orange-500" :
        booking.status === 'cancelled' ? "bg-red-500" : "bg-amber-500"
      )} />

      <div className="flex-1 p-5 flex flex-col justify-between">
        
        {/* Header (Status Desktop + Table Info) */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
               <span className="font-bold text-lg text-white">T{booking.tableNumber}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {booking.customerName}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                {booking.phone && (
                  <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mr-1">
                    {booking.phone}
                  </span>
                )}
                <Calendar className="w-3.5 h-3.5" /> {format(booking.date, 'MMM d')}
                <span className="mx-1">•</span>
                <Clock className="w-3.5 h-3.5" /> {booking.startTime} - {booking.endTime}
              </div>
            </div>
          </div>

          <div className={cn("px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0", config.bg, config.color)}>
             {booking.status === 'confirmed' && <CheckCircle className="w-3.5 h-3.5" />}
             {booking.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
             {config.label}
          </div>
        </div>

        {/* Pricing, Deposit & Notes Row */}
        <div className="flex items-start gap-4 text-sm mt-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-4 flex-1">
            {estCostDisplay !== null && (
              <div>
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Estimated Total</span>
                <span className="text-gray-300 font-medium line-through opacity-50 text-xs mr-2">₹{estCostDisplay}</span>
                <span className="text-gray-300 font-medium">₹{estCostDisplay - (booking.discount || 0)}</span>
              </div>
            )}
            {booking.advancePayment !== undefined && booking.advancePayment > 0 && (
              <div className={estCostDisplay !== null ? "pl-4 border-l border-white/5" : ""}>
                 <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Advance Paid</span>
                 <span className="text-[hsl(var(--gold))] font-bold flex items-center gap-1 drop-shadow-sm">
                   <IndianRupee className="w-3 h-3" /> {booking.advancePayment}
                 </span>
              </div>
            )}
            {booking.discount !== undefined && booking.discount > 0 && (
              <div className="pl-4 border-l border-white/5">
                 <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Discount</span>
                 <span className="text-emerald-400 font-bold flex items-center gap-1 drop-shadow-sm">
                   - <IndianRupee className="w-3 h-3" /> {booking.discount}
                 </span>
              </div>
            )}
          </div>
          
          {booking.note && (
            <div className="bg-blue-500/10 text-blue-400 p-2 rounded-xl text-xs flex items-start gap-2 max-w-[200px]">
              <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="leading-tight">{booking.note}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmationActions 
        booking={booking}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onRemind={onRemind}
        onAddNote={onAddNote}
        isOnline={isOnline}
      />

    </div>
  );
};

export default BookingCard;
