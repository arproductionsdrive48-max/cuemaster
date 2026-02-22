import { useState } from 'react';
import { useMembers } from '@/contexts/MembersContext';
import Header from '@/components/layout/Header';
import { Booking } from '@/types';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, User, X, CheckCircle, IndianRupee, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import {
  useBookings, useAddBooking, useUpdateBookingStatus,
} from '@/hooks/useSupabaseQuery';

const BookingsScreen = () => {
  const { tables, clubId, isOnline } = useMembers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    tableNumber: 0,
    customerName: '',
    startTime: '',
    endTime: '',
    advancePayment: '',
  });

  const { data: allBookings = [], isLoading } = useBookings(isOnline ? clubId : null);
  const { mutate: sbAddBooking, isPending: isAdding } = useAddBooking(isOnline ? clubId : null);
  const { mutate: sbUpdateStatus } = useUpdateBookingStatus(isOnline ? clubId : null);
  // Realtime invalidation handled globally by useRealtimeManager in MembersContext

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dayBookings = allBookings.filter(b => isSameDay(b.date, selectedDate));
  const hasBooking = (date: Date) => allBookings.some(d => isSameDay(d.date, date));

  const statusColors = {
    confirmed: 'bg-available/20 text-available border-available/30',
    pending: 'bg-paused/20 text-paused border-paused/30',
    cancelled: 'bg-primary/20 text-primary border-primary/30',
  };

  const handleCreateBooking = () => {
    if (!isOnline) {
      toast.error('Cannot create bookings while offline');
      return;
    }
    if (!newBooking.customerName || !newBooking.startTime || !newBooking.endTime || !newBooking.tableNumber) {
      toast.error('Please fill in all required fields');
      return;
    }
    const booking: Omit<Booking, 'id'> = {
      tableNumber: newBooking.tableNumber,
      customerName: newBooking.customerName,
      date: selectedDate,
      startTime: newBooking.startTime,
      endTime: newBooking.endTime,
      status: 'pending',
      advancePayment: newBooking.advancePayment ? parseFloat(newBooking.advancePayment) : undefined,
    };
    sbAddBooking(booking, {
      onSuccess: () => {
        toast.success('Booking created!');
        setShowCreateModal(false);
        setNewBooking({ tableNumber: 0, customerName: '', startTime: '', endTime: '', advancePayment: '' });
      },
      onError: (err: any) => toast.error(err?.message || 'Failed to create booking'),
    });
  };

  const handleConfirmBooking = (bookingId: string) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdateStatus({ id: bookingId, status: 'confirmed' }, {
      onSuccess: () => toast.success('Booking confirmed!'),
      onError: (err: any) => toast.error(err?.message || 'Failed to confirm booking'),
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdateStatus({ id: bookingId, status: 'cancelled' }, {
      onSuccess: () => toast.info('Booking cancelled'),
      onError: (err: any) => toast.error(err?.message || 'Failed to cancel booking'),
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Bookings" />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – connect to Supabase to manage bookings</p>
        </div>
      )}

      {/* Calendar */}
      <div className="px-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(prev => addDays(prev, -30))} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg">{format(currentDate, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentDate(prev => addDays(prev, 30))} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (<div key={`empty-${i}`} />))}
            {days.map(day => {
              const isSelected = isSameDay(day, selectedDate);
              const hasBookings = hasBooking(day);
              const today = isToday(day);
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all',
                  isSelected && 'bg-primary text-primary-foreground',
                  !isSelected && today && 'bg-secondary',
                  !isSelected && !today && 'hover:bg-secondary/50'
                )}>
                  <span className="text-sm font-medium">{format(day, 'd')}</span>
                  {hasBookings && (<div className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSelected ? 'bg-primary-foreground' : 'bg-primary')} />)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Bookings */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{isToday(selectedDate) ? "Today's Bookings" : format(selectedDate, 'MMM d')}</h3>
          <span className="text-sm text-muted-foreground">{dayBookings.length} bookings</span>
        </div>

        {isLoading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading bookings…</p>
          </div>
        ) : dayBookings.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No bookings for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayBookings.map(booking => (
              <div key={booking.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Table {booking.tableNumber}</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{booking.customerName}</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border capitalize', statusColors[booking.status])}>
                    {booking.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{booking.startTime}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{booking.endTime}</span>
                  {booking.advancePayment && booking.advancePayment > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-available">
                      <IndianRupee className="w-3 h-3" />
                      {booking.advancePayment} advance
                    </span>
                  )}
                </div>

                {booking.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmBooking(booking.id)}
                      disabled={!isOnline}
                      title={!isOnline ? 'Offline – changes will not save' : undefined}
                      className="flex-1 py-2 rounded-xl bg-available/20 text-available border border-available/30 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-available/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirm Booking
                    </button>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={!isOnline}
                      title={!isOnline ? 'Offline – changes will not save' : undefined}
                      className="py-2 px-3 rounded-xl bg-secondary text-muted-foreground text-sm font-semibold hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => isOnline ? setShowCreateModal(true) : toast.error('Offline – changes will not save')}
        title={!isOnline ? 'Offline – changes will not save' : 'New booking'}
        className={cn(
          "fixed bottom-28 right-4 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40",
          !isOnline && "opacity-50"
        )}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[70] bg-background animate-fade-in-up flex flex-col">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-bold">New Booking</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl hover:bg-accent/30">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-28">
            <p className="text-sm text-muted-foreground">
              Booking for: <span className="font-medium text-foreground">{format(selectedDate, 'MMMM d, yyyy')}</span>
            </p>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Customer Name *</label>
              <input
                type="text"
                value={newBooking.customerName}
                onChange={e => setNewBooking(p => ({ ...p, customerName: e.target.value }))}
                placeholder="Enter name"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Select Table *</label>
              <select
                value={newBooking.tableNumber}
                onChange={e => setNewBooking(p => ({ ...p, tableNumber: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
              >
                <option value={0} disabled>— Choose a table —</option>
                {tables.map(t => (
                  <option key={t.id} value={t.tableNumber}>
                    Table {t.tableNumber} {t.status !== 'free' ? `(${t.status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Time *</label>
                <input
                  type="time"
                  value={newBooking.startTime}
                  onChange={e => setNewBooking(p => ({ ...p, startTime: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Time *</label>
                <input
                  type="time"
                  value={newBooking.endTime}
                  onChange={e => setNewBooking(p => ({ ...p, endTime: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Advance Payment (₹) — Optional</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={newBooking.advancePayment}
                  onChange={e => setNewBooking(p => ({ ...p, advancePayment: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-background/80 backdrop-blur-xl border-t border-border/50 z-[70]">
            <button
              onClick={handleCreateBooking}
              disabled={isAdding}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {isAdding ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsScreen;
