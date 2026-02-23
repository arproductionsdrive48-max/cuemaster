import { useState, useRef } from 'react';
import { Tournament, TournamentType, PrizeDistribution } from '@/types';
import { ArrowLeft, Rocket, Calendar as CalendarIcon, IndianRupee, Image, Plus, Trash2, Trophy } from 'lucide-react';
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

  const gameFormats: TournamentType[] = ['Snooker', '8-Ball', '9-Ball'];

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
    console.log('[CueMaster] CreateTournament → isoDate:', isoDate.toISOString(), 'startTime:', formData.time || '10:00');

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
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center p-4">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-accent/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-2 font-semibold">New Tournament</span>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-64px)] pb-32">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-1">Create Event</h1>
          <p className="text-sm text-muted-foreground mb-6">Set up the details for your next big club tournament.</p>

          <div className="space-y-5">
            {/* Event Image */}
            <div>
              <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                Event Image
              </label>
              
              {/* Current Image Preview */}
              <div 
                className="relative h-32 rounded-xl overflow-hidden mb-3 cursor-pointer group"
                onClick={handleImageUpload}
              >
                <img 
                  src={customImagePreview || formData.image} 
                  alt="Tournament" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white">
                    <Image className="w-5 h-5" />
                    <span className="text-sm font-medium">Upload Custom Image</span>
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
              <p className="text-xs text-muted-foreground mb-2">Or choose from defaults:</p>
              <div className="flex gap-2">
                {defaultImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectDefaultImage(img)}
                    className={cn(
                      "w-20 h-14 rounded-lg overflow-hidden border-2 transition-all",
                      formData.image === img && !customImagePreview
                        ? "border-[hsl(var(--gold))]"
                        : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt={`Default ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Name */}
            <div>
              <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                Tournament Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Winter Championship 2024"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
              />
            </div>

            {/* Date & Start Time */}
            <div>
              <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                Date & Start Time
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))] pointer-events-none" />
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Game Format */}
            <div>
              <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                Game Format
              </label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TournamentType }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 appearance-none"
                >
                  {gameFormats.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Main Hall, Table 1-4"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
              />
            </div>

            {/* Max Players & Entry Fee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                  Max Players
                </label>
                <input
                  type="number"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                  Entry Fee
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                  <input
                    type="number"
                    value={formData.entryFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
                  />
                </div>
              </div>
            </div>

            {/* Prize Distribution */}
            <div className="bg-secondary/30 rounded-2xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
                <span className="font-semibold">Prize Distribution</span>
              </div>

              {/* Estimated pool */}
              <div className="mb-4 p-3 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estimated from entries</span>
                  <span className="font-medium text-[hsl(var(--gold))]">₹{estimatedFromEntry.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {prizeDistribution.map((prize, idx) => (
                  <div key={prize.place} className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                      prize.place === 1 ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" :
                      prize.place === 2 ? "bg-silver/20 text-silver" :
                      prize.place === 3 ? "bg-bronze/20 text-bronze" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {prize.place === 1 ? '🥇' : prize.place === 2 ? '🥈' : prize.place === 3 ? '🥉' : `${prize.place}th`}
                    </div>
                    <div className="flex-1 relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                      <input
                        type="number"
                        value={prize.amount || ''}
                        onChange={(e) => handleUpdatePrize(prize.place, Number(e.target.value))}
                        placeholder={`${prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : `${prize.place}th`} Place Prize`}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                      />
                    </div>
                    {idx >= 3 && (
                      <button
                        onClick={() => handleRemovePrizePlace(prize.place)}
                        className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddPrizePlace}
                className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground hover:border-[hsl(var(--gold))]/50 hover:text-[hsl(var(--gold))] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add More Places
              </button>

              {/* Total */}
              <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                <span className="text-sm font-medium">Total Prize Pool</span>
                <span className="text-lg font-bold text-[hsl(var(--gold))]">₹{totalPrizePool.toLocaleString()}</span>
              </div>
            </div>

            {/* Allow Waitlist */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
              <div>
                <p className="font-medium text-sm">Allow Waitlist</p>
                <p className="text-xs text-muted-foreground">Enable when full</p>
              </div>
              <button
                onClick={() => setFormData(prev => ({ ...prev, allowWaitlist: !prev.allowWaitlist }))}
                className={cn(
                  'w-12 h-7 rounded-full p-1 transition-colors',
                  formData.allowWaitlist ? 'bg-[hsl(var(--gold))]' : 'bg-secondary'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  formData.allowWaitlist && 'translate-x-5'
                )} />
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-[hsl(var(--gold))] uppercase tracking-wide font-medium mb-2 block">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add tournament details..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action - z-[70] to be above tab bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-24 bg-background/80 backdrop-blur-xl border-t border-border/50 z-[70]">
        <button
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Launch Tournament <Rocket className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
