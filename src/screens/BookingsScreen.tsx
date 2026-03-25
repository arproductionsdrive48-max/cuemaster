import React, { useState, Suspense, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { useMembers } from '@/contexts/MembersContext';
import { Booking } from '@/types';
import { Calendar, Clock, MapPin, IndianRupee, MessageCircle, CheckCircle, XCircle, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { useBookings, useAddBooking, useUpdateBookingStatus, useUpdateBooking } from '@/hooks/useSupabaseQuery';
import BookingCard from '@/components/bookings/BookingCard';
import PublicBookingLinkGenerator from '@/components/bookings/PublicBookingLinkGenerator';
import WaitlistButton from '@/components/bookings/WaitlistButton';

const CalendarView = React.lazy(() => import('@/components/bookings/CalendarView'));

const BookingsScreen = () => {
  const { tables, clubId, isOnline } = useMembers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    tableNumber: 0,
    customerName: '',
    phone: '',
    startTime: '',
    endTime: '',
    advancePayment: '',
    discount: '',
  });

  const { data: allBookings = [], isLoading } = useBookings(isOnline ? clubId : null);
  const { mutate: sbAddBooking, isPending: isAdding } = useAddBooking(clubId);
  const { mutate: sbUpdateStatus } = useUpdateBookingStatus(clubId);
  const { mutate: sbUpdateBooking } = useUpdateBooking(clubId);
  // Realtime invalidation handled globally by useRealtimeManager in MembersContext

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const dayBookings = useMemo(() => allBookings.filter(b => isSameDay(b.date, selectedDate)), [allBookings, selectedDate]);
  const hasBooking = (date: Date) => allBookings.some(d => isSameDay(d.date, date));

  const statusColors = {
    confirmed: 'bg-available/20 text-available border-available/30',
    pending: 'bg-paused/20 text-paused border-paused/30',
    cancelled: 'bg-primary/20 text-primary border-primary/30',
  };

  const checkOverlap = (b1Start: string, b1End: string, b2Start: string, b2End: string) => {
    return b1Start < b2End && b1End > b2Start;
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

    // Check waitlist collision
    const overlaps = dayBookings.some(b =>
      b.tableNumber === newBooking.tableNumber &&
      b.status !== 'cancelled' &&
      checkOverlap(newBooking.startTime, newBooking.endTime, b.startTime, b.endTime)
    );

    const finalStatus = overlaps ? 'waitlisted' : 'pending';

    const booking: Omit<Booking, 'id'> = {
      tableNumber: newBooking.tableNumber,
      customerName: newBooking.customerName,
      phone: newBooking.phone || undefined,
      date: selectedDate,
      startTime: newBooking.startTime,
      endTime: newBooking.endTime,
      status: finalStatus,
      advancePayment: newBooking.advancePayment ? parseFloat(newBooking.advancePayment) : undefined,
      discount: newBooking.discount ? parseFloat(newBooking.discount) : undefined,
    };

    sbAddBooking(booking, {
      onSuccess: () => {
        if (overlaps) {
          toast.info('Table occupied at that time. Added to Waitlist!');
        } else {
          toast.success('Booking created successfully!');
        }
        setShowCreateModal(false);
        setNewBooking({ tableNumber: 0, customerName: '', phone: '', startTime: '', endTime: '', advancePayment: '', discount: '' });
      },
      onError: (err: any) => toast.error(err?.message || 'Failed to create booking'),
    });
  };

  const isOverlapDetected = useMemo(() => {
    return dayBookings.some(b =>
      b.tableNumber === newBooking.tableNumber &&
      b.status !== 'cancelled' &&
      newBooking.startTime && newBooking.endTime &&
      checkOverlap(newBooking.startTime, newBooking.endTime, b.startTime, b.endTime)
    );
  }, [dayBookings, newBooking.tableNumber, newBooking.startTime, newBooking.endTime]);

  const handleConfirmBooking = (bookingId: string) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdateStatus({ id: bookingId, status: 'confirmed' }, {
      onSuccess: () => toast.success('Booking confirmed!'),
      onError: (err: any) => toast.error(err?.message || 'Failed to confirm booking'),
    });
  };

  const handleCompleteBooking = (bookingId: string) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdateStatus({ id: bookingId, status: 'completed' }, {
      onSuccess: () => toast.success('Booking marked as completed!'),
      onError: (err: any) => toast.error(err?.message || 'Failed to complete booking'),
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdateStatus({ id: bookingId, status: 'cancelled' }, {
      onSuccess: () => toast.info('Booking cancelled'),
      onError: (err: any) => toast.error(err?.message || 'Failed to cancel booking'),
    });
  };

  const handleAddNote = (bookingId: string, note: string | null) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdateBooking({ id: bookingId, note: note || undefined }, {
      onSuccess: () => toast.success('Note attached to booking'),
      onError: (err: any) => toast.error(err?.message || 'Failed to add note'),
    });
  };

  const handleRemind = (booking: Booking) => {
    const text = `Hi ${booking.customerName},\nThis is a reminder for your booking at our club on ${format(booking.date, 'MMM do')} from ${booking.startTime} to ${booking.endTime}.\n\nPlease arrive on time!`;
    const url = `https://wa.me/${booking.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Bookings" />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – connect to Supabase to manage bookings</p>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="flex flex-col md:flex-row gap-6 px-4">

        {/* Left Pane: Calendar */}
        <div className="md:w-[340px] shrink-0">
          <Suspense fallback={<div className="glass-card p-12 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin"/></div>}>
            <CalendarView
              currentDate={currentDate}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onCurrentDateChange={setCurrentDate}
              allBookings={allBookings || []}
            />
          </Suspense>

          <PublicBookingLinkGenerator clubId={clubId} />
        </div>

        {/* Right Pane: Selected Date Bookings */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl">{isToday(selectedDate) ? "Today's Bookings" : format(selectedDate, 'MMM d, yyyy')}</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-white/5 px-3 py-1 rounded-full">{dayBookings.length} bookings</span>
          </div>

          {isLoading ? (
            <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-8 text-center flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Syncing bookings...</p>
            </div>
          ) : dayBookings.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-12 text-center flex flex-col items-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                 <Calendar className="w-8 h-8 text-gray-500" />
              </div>
              <h4 className="text-lg font-bold mb-1">No Bookings Found</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">There are no reservations scheduled for this date. Click the plus button to add one manually.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-max">
              {dayBookings.map(booking => (
                 <BookingCard
                   key={booking.id}
                   booking={booking}
                   tablePricing={{ perHour: 200, perMinute: 3.33, perFrame: 100, peakHourRate: 250, offPeakRate: 150, peakHoursStart: '18:00', peakHoursEnd: '23:00', defaultBillingMode: 'hourly' }} // Default fallback, should ideally come from MembersContext config
                   onConfirm={handleConfirmBooking}
                   onComplete={handleCompleteBooking}
                   onCancel={handleCancelBooking}
                   onRemind={handleRemind}
                   onAddNote={handleAddNote}
                   isOnline={isOnline}
                 />
              ))}
            </div>
          )}
        </div>
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
        <div className="fixed inset-0 z-[70] bg-[#0B0B0B] text-white animate-fade-in flex flex-col">
          <div className="sticky top-0 z-10 bg-[#0B0B0B] border-b border-white/5">
            <div className="flex items-center justify-between p-4 max-w-5xl mx-auto w-full">
              <h3 className="text-xl font-extrabold tracking-tight">New Booking</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 max-w-5xl mx-auto w-full space-y-6">
            <p className="text-sm font-medium text-gray-400">
              Booking for: <span className="font-bold text-white tracking-wide ml-1">{format(selectedDate, 'MMMM d, yyyy')}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Customer Name *</label>
                <input
                  type="text"
                  value={newBooking.customerName}
                  onChange={e => setNewBooking(p => ({ ...p, customerName: e.target.value }))}
                  placeholder="Enter name"
                  className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white placeholder:text-gray-600 outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={newBooking.phone}
                  onChange={e => setNewBooking(p => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. +91 999 999 9999"
                  className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white placeholder:text-gray-600 outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[hsl(var(--gold))] font-bold uppercase tracking-wider mb-2 block">Select Table *</label>
              <div className="relative">
                <select
                  value={newBooking.tableNumber}
                  onChange={e => setNewBooking(p => ({ ...p, tableNumber: Number(e.target.value) }))}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white outline-none focus:border-[hsl(var(--gold))]/50 appearance-none font-bold cursor-pointer transition-colors"
                >
                  <option value={0} disabled>— Choose a table —</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.tableNumber}>
                      Table {t.tableNumber} {t.status !== 'free' ? `(${t.status.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 border-b-2 border-r-2 border-[hsl(var(--gold))] rotate-45 transform" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Start Time *</label>
                <div className="relative">
                  <input
                    type="time"
                    value={newBooking.startTime}
                    onChange={e => setNewBooking(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative bg-transparent cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-[#121212] rounded-xl pointer-events-none border border-white/5" />
                  <input type="time" value={newBooking.startTime} readOnly className="absolute inset-0 w-full h-full px-4 py-3.5 bg-transparent border-none text-white outline-none font-medium pointer-events-none" />
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-20" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">End Time *</label>
                <div className="relative">
                  <input
                    type="time"
                    value={newBooking.endTime}
                    onChange={e => setNewBooking(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative bg-transparent cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-[#121212] rounded-xl pointer-events-none border border-white/5" />
                  <input type="time" value={newBooking.endTime} readOnly className="absolute inset-0 w-full h-full px-4 py-3.5 bg-transparent border-none text-white outline-none font-medium pointer-events-none" />
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-20" />
                </div>
              </div>
            </div>

            {/* Waitlist Warning Context */}
            {isOverlapDetected && newBooking.customerName && (
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl text-sm mb-3 flex items-start gap-3">
                 <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                 <p className="font-medium">This time slot directly overlaps with an existing booking on Table {newBooking.tableNumber}. Submitting will push this booking into the <span className="font-bold underline">Waitlist</span>.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Advance Paid (optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold">₹</span>
                  </div>
                  <input
                    type="number"
                    value={newBooking.advancePayment}
                    onChange={e => setNewBooking(p => ({ ...p, advancePayment: e.target.value }))}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white placeholder:text-gray-600 outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#00A389] font-bold uppercase tracking-wider mb-2 block">Discount (optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <span className="text-[#00A389] font-bold">₹</span>
                  </div>
                  <input
                    type="number"
                    value={newBooking.discount}
                    onChange={e => setNewBooking(p => ({ ...p, discount: e.target.value }))}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-[#00A389] placeholder:text-[#00A389]/30 outline-none focus:border-[#00A389]/50 transition-colors font-bold text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-[#0B0B0B] border-t border-white/5 z-[70]">
            <div className="max-w-5xl mx-auto w-full">
              {isOverlapDetected ? (
                <WaitlistButton onJoinWaitlist={handleCreateBooking} disabled={!isOnline} />
              ) : (
                <button
                  onClick={handleCreateBooking}
                  disabled={!isOnline || isAdding}
                  className="w-full py-4 rounded-xl bg-[#Facc15] text-black font-extrabold text-sm uppercase tracking-wide hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-[#Facc15]/10"
                >
                  {isAdding ? 'Creating…' : 'Create Booking'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsScreen;
