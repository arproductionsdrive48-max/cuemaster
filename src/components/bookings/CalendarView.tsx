import React from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Booking } from '@/types';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onCurrentDateChange: (date: Date) => void;
  allBookings: Booking[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, selectedDate, onDateChange, onCurrentDateChange, allBookings }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const hasBooking = (date: Date) => allBookings.some(d => isSameDay(d.date, date));

  return (
    <div className="glass-card p-4 mx-auto w-full md:sticky md:top-24">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onCurrentDateChange(addDays(currentDate, -30))} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center transition-colors hover:bg-white/10">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg">{format(currentDate, 'MMMM yyyy')}</h3>
        <button onClick={() => onCurrentDateChange(addDays(currentDate, 30))} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center transition-colors hover:bg-white/10">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs text-[#a0a0a0] font-medium py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (<div key={`empty-${i}`} />))}
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const hasBookings = hasBooking(day);
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onDateChange(day)} className={cn(
              'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 font-medium',
              isSelected ? 'bg-[hsl(var(--gold))] text-black shadow-lg shadow-[hsl(var(--gold))]/20 scale-105' :
              today ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400'
            )}>
              <span className="text-sm">{format(day, 'd')}</span>
              {hasBookings && (<div className={cn('w-1.5 h-1.5 rounded-full mt-1', isSelected ? 'bg-black/50' : 'bg-[hsl(var(--gold))]')} />)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
