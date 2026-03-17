import { useState, useRef } from 'react';
import { Tournament, TournamentType, PrizeDistribution } from '@/types';
import { ArrowLeft, Rocket, Calendar as CalendarIcon, IndianRupee, Image, Plus, Trash2, Trophy, Wand2 } from 'lucide-react';
import { generateTournamentSuggestions } from '@/services/smartGenerator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import default tournament images
import tournamentBg1 from '@/assets/tournament-bg-1.jpg';
import tournamentBg2 from '@/assets/tournament-bg-2.jpg';
import tournamentBg3 from '@/assets/tournament-bg-3.jpg';

interface CreateTournamentModalProps {
  onClose: () => void;
  onCreate: (tournament: Omit<Tournament, 'id' | 'registeredPlayers' | 'status'>) => void;
}

const defaultImages = [tournamentBg1, tournamentBg2, tournamentBg3];

const CreateTournamentModal = ({ onClose, onCreate }: CreateTournamentModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '8-Ball' as TournamentType,
    date: '',
    time: '',
    location: '',
    maxPlayers: 32,
    entryFee: 500,
    description: '',
    allowWaitlist: false,
    image: defaultImages[0],
  });

  const [prizeDistribution, setPrizeDistribution] = useState<PrizeDistribution[]>([
    { place: 1, amount: 0 },
    { place: 2, amount: 0 },
    { place: 3, amount: 0 },
  ]);

  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Array<{ name: string; description: string }>>([]);

  const gameFormats: TournamentType[] = ['Snooker', '8-Ball', '9-Ball'];

  const handleSuggestNames = () => {
    const results = generateTournamentSuggestions(
      formData.type,
      formData.location || undefined,
      formData.entryFee || undefined,
      formData.name || undefined
    );
    setSuggestions(results);
    toast.success(`✨ ${results.length} tournament ideas generated!`);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomImagePreview(result);
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectDefaultImage = (img: string) => {
    setCustomImagePreview(null);
    setFormData(prev => ({ ...prev, image: img }));
  };

  const handleUpdatePrize = (place: number, amount: number) => {
    setPrizeDistribution(prev => 
      prev.map(p => p.place === place ? { ...p, amount } : p)
    );
  };

  const handleAddPrizePlace = () => {
    const nextPlace = prizeDistribution.length + 1;
    setPrizeDistribution(prev => [...prev, { place: nextPlace, amount: 0 }]);
  };

  const handleRemovePrizePlace = (place: number) => {
    setPrizeDistribution(prev => 
      prev.filter(p => p.place !== place)
        .map((p, i) => ({ ...p, place: i + 1 }))
    );
  };

  const totalPrizePool = prizeDistribution.reduce((sum, p) => sum + p.amount, 0);
  const estimatedFromEntry = formData.maxPlayers * formData.entryFee;

  const handleSubmit = () => {
    if (!formData.name || !formData.date || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    const validPrizes = prizeDistribution.filter(p => p.amount > 0);

    // Build a proper ISO Date to avoid "invalid input syntax for type timestamp"
    const isoDate = new Date(formData.date + 'T' + (formData.time || '10:00') + ':00');
    console.log('[Snook OS] CreateTournament → isoDate:', isoDate.toISOString(), 'startTime:', formData.time || '10:00');

    onCreate({
      name: formData.name,
      type: formData.type,
      date: isoDate,
      startTime: formData.time || '10:00',
      location: formData.location,
      maxPlayers: formData.maxPlayers,
      entryFee: formData.entryFee,
      prizePool: totalPrizePool || undefined,
      prizeDistribution: validPrizes.length > 0 ? validPrizes : undefined,
      description: formData.description || undefined,
      image: formData.image,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0B0B] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0B0B0B] border-b border-white/5">
        <div className="flex items-center p-4">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-2 font-bold text-lg">New Tournament</span>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-64px)] pb-32">
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-1 tracking-tight">Create Event</h1>
          <p className="text-sm text-gray-500 mb-8">Set up the details for your next big club tournament.</p>

          <div className="space-y-5">
            {/* Event Image */}
            <div>
              <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                Event Image
              </label>
              
              {/* Current Image Preview */}
              <div 
                className="relative h-40 max-w-full rounded-2xl overflow-hidden mb-3 cursor-pointer group bg-[#121212] border border-white/5"
                onClick={handleImageUpload}
              >
                <img 
                  src={customImagePreview || formData.image} 
                  alt="Tournament" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[hsl(var(--gold))]">
                    <Image className="w-5 h-5" />
                    <span className="text-sm font-bold">Upload Custom Image</span>
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Default Image Options */}
              <p className="text-xs text-gray-500 mb-2">Or choose from defaults:</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {defaultImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectDefaultImage(img)}
                    className={cn(
                      "w-24 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                      formData.image === img && !customImagePreview
                        ? "border-[hsl(var(--gold))] scale-105 shadow-md shadow-[hsl(var(--gold))]/20"
                        : "border-transparent opacity-50 hover:opacity-100 border-[#333]"
                    )}
                  >
                    <img src={img} alt={`Default ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Name */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider block">
                  Tournament Name
                </label>
                <button 
                  onClick={handleSuggestNames}
                  className="text-xs text-[hsl(var(--gold))] flex items-center gap-1 hover:opacity-80 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Suggest Names + Description
                </button>
              </div>
              
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Winter Championship 2024"
                className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 transition-all font-medium"
              />

              {suggestions.length > 0 && (
                <div className="mt-3 space-y-2 animate-fade-in-up">
                  <p className="text-xs text-gray-500">Tap to use — fills name &amp; description:</p>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFormData(prev => ({ ...prev, name: s.name, description: s.description }))}
                      className="w-full text-left p-3 rounded-xl bg-[hsl(var(--gold))]/5 border border-[hsl(var(--gold))]/15 hover:bg-[hsl(var(--gold))]/15 transition-all group"
                    >
                      <p className="text-sm font-semibold text-[hsl(var(--gold))] group-hover:underline">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{s.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Start Time */}
            <div>
              <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                Date & Start Time
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative bg-transparent"
                  />
                  <div className="absolute inset-0 bg-[#121212] rounded-xl pointer-events-none" />
                  <input type="date" value={formData.date} readOnly className="absolute inset-0 w-full h-full px-4 py-3.5 bg-transparent border-none text-white outline-none font-medium pointer-events-none" />
                  <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))] pointer-events-none z-20" />
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative bg-transparent"
                  />
                  <div className="absolute inset-0 bg-[#121212] rounded-xl pointer-events-none" />
                  <input type="time" value={formData.time} readOnly className="absolute inset-0 w-full h-full px-4 py-3.5 bg-transparent border-none text-white outline-none font-medium pointer-events-none" />
                  <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))] pointer-events-none z-20" />
                </div>
              </div>
            </div>

            {/* Game Format */}
            <div>
              <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                Game Format
              </label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TournamentType }))}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 font-medium appearance-none cursor-pointer"
                >
                  {gameFormats.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 border-b-2 border-r-2 border-[hsl(var(--gold))] rotate-45 transform" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Main Hall, Table 1-4"
                className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 font-medium"
              />
            </div>

            {/* Max Players & Entry Fee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                  Max Players
                </label>
                <input
                  type="number"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: Number(e.target.value) }))}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                  Entry Fee
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                  <input
                    type="number"
                    value={formData.entryFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-[#121212] border-none text-[hsl(var(--gold))] font-bold outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50"
                  />
                </div>
              </div>
            </div>

            {/* Prize Distribution */}
            <div className="bg-[#121212] rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
                <span className="font-bold text-white">Prize Distribution</span>
              </div>

              {/* Estimated pool */}
              <div className="mb-5 flex items-center justify-between text-sm pb-4 border-b border-white/5">
                <span className="text-gray-500 font-medium">Estimated from entries</span>
                <span className="font-bold text-[hsl(var(--gold))] text-lg">₹{estimatedFromEntry.toLocaleString()}</span>
              </div>
              
              <div className="space-y-3">
                {prizeDistribution.map((prize, idx) => (
                  <div key={prize.place} className="flex items-center gap-3">
                    <div className="w-10 text-xs font-bold text-[hsl(var(--gold))] uppercase tracking-wider">
                      {prize.place === 1 ? '🥇 1st' : prize.place === 2 ? '🥈 2nd' : prize.place === 3 ? '🥉 3rd' : `${prize.place}th`}
                    </div>
                    <div className="flex-1 relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                      <input
                        type="number"
                        value={prize.amount || ''}
                        onChange={(e) => handleUpdatePrize(prize.place, Number(e.target.value))}
                        placeholder="Prize amount"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-white/5 text-[hsl(var(--gold))] font-bold placeholder:text-gray-600 outline-none focus:border-[hsl(var(--gold))]/50 text-sm transition-colors"
                      />
                    </div>
                    {idx >= 3 && (
                      <button
                        onClick={() => handleRemovePrizePlace(prize.place)}
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddPrizePlace}
                className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/10 text-sm text-gray-500 hover:border-white/20 hover:text-white transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Rank Prize
              </button>

              {/* Total */}
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Total Prize Pool</span>
                <span className="text-xl font-bold text-[hsl(var(--gold))]">₹{totalPrizePool.toLocaleString()}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-[hsl(var(--gold))] uppercase font-bold tracking-wider mb-2 block">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add tournament details..."
                rows={3}
                className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border-none text-white placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]/50 resize-none font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-[#0B0B0B] border-t border-white/5 z-[70] max-w-4xl mx-auto flex items-center justify-center">
        <button
          onClick={handleSubmit}
          className="w-full max-w-md py-4 rounded-xl bg-[hsl(var(--gold))] text-black font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
        >
          Launch Tournament <Rocket className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
