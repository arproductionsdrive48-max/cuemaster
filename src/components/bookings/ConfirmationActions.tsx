import React from 'react';
import { Booking } from '@/types';
import { CheckCircle, MessageCircle, XCircle, StickyNote, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConfirmationActionsProps {
  booking: Booking;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onRemind: (booking: Booking) => void;
  onAddNote: (id: string, note: string | null) => void;
  isOnline: boolean;
}

const ConfirmationActions: React.FC<ConfirmationActionsProps> = ({ booking, onConfirm, onComplete, onCancel, onRemind, onAddNote, isOnline }) => {
  
  // A link is "expired" if the booking is in the past OR it's completed/cancelled
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = booking.date instanceof Date ? booking.date : new Date(booking.date as string);
  bookingDate.setHours(0, 0, 0, 0);
  const isExpired = booking.status === 'completed' || booking.status === 'cancelled' || bookingDate < today;

  const handleCopyLink = () => {
    const link = `https://snookospublic.vercel.app/book?bookingId=${booking.id}&table=${booking.tableNumber}&time=${encodeURIComponent(booking.startTime)}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Public booking link copied! Share with customer via WhatsApp.', {
        description: link,
        duration: 5000,
      });
    }).catch(() => {
      // Fallback for environments where clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Public booking link copied! Share with customer via WhatsApp.');
    });
  };

  return (
    <div className="flex flex-row md:flex-col items-stretch border-t md:border-t-0 md:border-l border-white/5 bg-black/20 w-full md:w-32 shrink-0 p-2 gap-2">
      {booking.status === 'pending' || booking.status === 'waitlisted' ? (
        <button 
          onClick={() => onConfirm(booking.id)}
          disabled={!isOnline}
          className="flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Confirm</span>
        </button>
      ) : null}

      {booking.status === 'confirmed' ? (
        <button 
          onClick={() => onComplete(booking.id)}
          disabled={!isOnline}
          className="flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Complete</span>
        </button>
      ) : null}

      <button 
        onClick={() => onRemind(booking)}
        disabled={booking.status === 'cancelled'}
        className="flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 text-xs font-bold transition-colors disabled:opacity-50 disabled:grayscale"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Remind</span>
      </button>

      {/* Copy Public Link */}
      <button
        onClick={isExpired ? undefined : handleCopyLink}
        disabled={isExpired}
        title={isExpired ? 'Link expired' : 'Generate shareable link for customer'}
        className={
          isExpired
            ? 'flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-gray-600 border border-transparent text-xs font-bold cursor-not-allowed opacity-40'
            : 'flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 text-xs font-bold transition-colors'
        }
      >
        <Link2 className="w-4 h-4" />
        <span>{isExpired ? 'Expired' : 'Link'}</span>
      </button>

      <button 
        onClick={() => {
           const newNote = prompt('Enter a note for this booking:', booking.note || '');
           if (newNote !== null) {
             onAddNote(booking.id, newNote);
           }
        }}
        disabled={!isOnline}
        className="flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-blue-400 hover:bg-blue-500/10 hover:text-blue-400 border border-transparent hover:border-blue-500/20 text-xs font-bold transition-colors disabled:opacity-50"
      >
        <StickyNote className="w-4 h-4" />
        <span>Note</span>
      </button>

      {booking.status !== 'cancelled' && (
        <button 
          onClick={() => onCancel(booking.id)}
          disabled={!isOnline}
          className="flex-1 flex md:flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      )}
    </div>
  );
};

export default ConfirmationActions;
