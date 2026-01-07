import { useState } from 'react';
import { bookings as initialBookings } from '@/data/mockData';
import Header from '@/components/layout/Header';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

const BookingsScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dayBookings = initialBookings.filter(b => isSameDay(b.date, selectedDate));
  const bookedDates = initialBookings.map(b => b.date);

  const hasBooking = (date: Date) => bookedDates.some(d => isSameDay(d, date));

  const statusColors = {
    confirmed: 'bg-available/20 text-available border-available/30',
    pending: 'bg-paused/20 text-paused border-paused/30',
    cancelled: 'bg-primary/20 text-primary border-primary/30',
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Bookings" />

      {/* Calendar */}
      <div className="px-4 mb-6">
        <div className="glass-card p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, -30))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg">{format(currentDate, 'MMMM yyyy')}</h3>
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, 30))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const isSelected = isSameDay(day, selectedDate);
              const hasBookings = hasBooking(day);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && today && 'bg-secondary',
                    !isSelected && !today && 'hover:bg-secondary/50'
                  )}
                >
                  <span className="text-sm font-medium">{format(day, 'd')}</span>
                  {hasBookings && (
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full mt-0.5',
                      isSelected ? 'bg-primary-foreground' : 'bg-primary'
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Bookings */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {isToday(selectedDate) ? "Today's Bookings" : format(selectedDate, 'MMM d')}
          </h3>
          <span className="text-sm text-muted-foreground">{dayBookings.length} bookings</span>
        </div>

        {dayBookings.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No bookings for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayBookings.map(booking => (
              <div key={booking.id} className="glass-card-hover p-4">
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
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border capitalize',
                    statusColors[booking.status]
                  )}>
                    {booking.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{booking.startTime}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{booking.endTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab bottom-24 right-4">
        <Plus className="w-6 h-6 text-primary-foreground" />
      </button>
    </div>
  );
};

export default BookingsScreen;
