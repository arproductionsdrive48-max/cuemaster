import { useState } from 'react';
import { MatchRecord } from '@/types';
import { X, Clock, ShoppingBag, Printer, Wand2, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateReceiptText } from '@/lib/billing';
import { useMembers } from '@/contexts/MembersContext';
import { mlService } from '@/services/mlService';
import { toast } from 'sonner';

interface MatchDetailModalProps {
  match: MatchRecord;
  onClose: () => void;
}

const MatchDetailModal = ({ match, onClose }: MatchDetailModalProps) => {
  const { clubSettings } = useMembers();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [mlLoadingMsg, setMlLoadingMsg] = useState('Processing smart highlights...');

  const handleGenerateHighlights = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setMlLoadingMsg('Processing smart highlights...');
    
    const unsubscribe = mlService.onProgress((info) => {
      if (info.status === 'init' || info.status === 'downloading' || info.status === 'progress') {
        const percent = info.progress ? Math.round(info.progress) : 0;
        setMlLoadingMsg(percent > 0 ? `Loading AI model from cache... ${percent}%` : 'Loading AI model...');
      } else if (info.status === 'generating') {
        setMlLoadingMsg('Generating highlights. This may take a moment on your device...');
      }
    });

    try {
      const winners = match.players.filter(p => p.result === 'win').map(p => p.name);
      const winnerText = winners.length > 0 ? winners.join(' & ') : '';
      const playerNames = match.players.map(p => p.name).join(' & ');
      
      const prompt = `You are a hype-man sports commentator.
Task: Write a 1-sentence WhatsApp highlight text for a snooker match played by ${playerNames}.
${winnerText ? `Explicitly mention that ${winnerText} won the match.` : 'The match was a close draw.'}
Rules:
- Keep it under 20 words.
- Include 1 fire emoji.
- Example: "Epic match! Amit takes down Rahul 4-2 on Table 8! \uD83D\uDD25"`;

      const result = await mlService.generateText(
        prompt, 
        `Write WhatsApp commentary for ${playerNames}'s match. ${winnerText ? winnerText + ' won.' : 'It was a draw.'}`, 
        40,
        'commentary',
        { players: playerNames, tableNum: match.tableNumber, winner: winnerText }
      );

      const vsHeader = `*${playerNames.split(' & ').join(' vs ')} (Table ${match.tableNumber})*\n\n`;
      setGeneratedText(vsHeader + result);
    } catch (err) {
      toast.error('Failed to generate highlights offline');
    } finally {
      setIsGenerating(false);
      setMlLoadingMsg('');
      unsubscribe();
    }
  };

  const copyToWhatsApp = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = generatedText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toast.success('Copied! Send it on WhatsApp.');
    } catch (err) {
      toast.error('Failed to copy text');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Table ${match.tableNumber}</title>
          <style>
            body { 
              font-family: monospace; 
              padding: 40px 20px;
              color: #000;
              background: #fff;
              max-width: 350px;
              margin: 0 auto;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 13px;
              line-height: 1.5;
            }
            .logo {
              width: 60px;
              height: 60px;
              margin: 0 auto 20px auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="/logo.png" class="logo" onerror="this.style.display='none'" />
          <pre>${receiptContent}</pre>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const receiptContent = generateReceiptText(
    clubSettings.clubName,
    match.tableNumber,
    'Snooker', // default as match record might not have it
    match.sessionStartTime ? new Date(match.sessionStartTime) : null,
    match.sessionEndTime ? new Date(match.sessionEndTime) : null,
    match.duration,
    match.totalBill,
    (match as any).paymentMethod || '',
    match.items || []
  );

  const formatDuration = (ms: number) => {
    const mins = Math.floor(Math.max(0, ms) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  const itemsTotal = (match.items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
  const tableCharge = match.totalBill - itemsTotal;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-3xl p-5 pb-24 animate-fade-in-up max-h-[85vh] overflow-y-auto"
        style={{ background: 'radial-gradient(ellipse at top, #2a261c 0%, #0d0c0a 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Session Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table & Time */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-secondary/30">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <span className="text-sm font-bold">{String(match.tableNumber).padStart(2, '0')}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Table {match.tableNumber}</p>
            <p className="text-xs text-muted-foreground">{format(match.date, 'MMM dd, yyyy • hh:mm a')}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[hsl(var(--gold))]">₹{match.totalBill}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{match.billingMode.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Session Times */}
        {(match.sessionStartTime || match.sessionEndTime) && (
          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {match.sessionStartTime && <span>Start: <span className="text-foreground font-medium">{format(match.sessionStartTime, 'hh:mm a')}</span></span>}
            {match.sessionStartTime && match.sessionEndTime && <span>→</span>}
            {match.sessionEndTime && <span>End: <span className="text-foreground font-medium">{format(match.sessionEndTime, 'hh:mm a')}</span></span>}
            {match.duration > 0 && <span className="ml-auto text-[hsl(var(--gold))]">{formatDuration(match.duration)}</span>}
          </div>
        )}

        {/* Players */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Players</p>
          <div className="space-y-1.5">
            {match.players.map((player, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/40">
                <span className="text-sm font-medium">{player.name}</span>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded',
                  player.result === 'win' ? 'bg-[hsl(var(--gold))] text-black'
                    : player.result === 'loss' ? 'bg-destructive text-white'
                    : 'bg-secondary text-muted-foreground'
                )}>
                  {player.result === 'win' ? 'W' : player.result === 'loss' ? 'L' : 'D'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Session Items (F&B) */}
        {match.items && match.items.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Items Ordered</p>
            </div>
            <div className="rounded-xl bg-secondary/30 overflow-hidden">
              {match.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 rounded px-1.5 py-0.5">{item.quantity}x</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-[hsl(var(--gold))]">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">Items Total</span>
                <span className="text-sm font-bold">₹{itemsTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bill Breakdown */}
        <div className="rounded-xl bg-secondary/30 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Table Charge</span>
            <span>₹{Math.max(0, tableCharge)}</span>
          </div>
          {itemsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">F&B</span>
              <span>₹{itemsTotal}</span>
            </div>
          )}
          {match.paymentMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="capitalize">{match.paymentMethod}{match.qrUsed ? ' (QR)' : ''}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-[hsl(var(--gold))] text-lg">₹{match.totalBill}</span>
          </div>
        </div>

        {/* Generate / Show Highlights */}
        {isGenerating ? (
          <div className="mt-6 flex flex-col items-center justify-center p-4 rounded-xl bg-[hsl(var(--gold))]/5 border border-[hsl(var(--gold))]/10 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[hsl(var(--gold))] animate-spin" />
            <p className="text-xs font-medium text-[hsl(var(--gold))] animate-pulse">{mlLoadingMsg}</p>
          </div>
        ) : generatedText ? (
          <div className="mt-6 rounded-xl bg-[#121212] border border-white/10 overflow-hidden">
            <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Match Highlights</span>
              <button 
                onClick={handleGenerateHighlights}
                className="text-xs text-[hsl(var(--gold))] hover:text-white transition-colors flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" /> Regenerate
              </button>
            </div>
            <div className="p-4 text-sm font-mono text-emerald-400 whitespace-pre-wrap">
              {generatedText}
            </div>
            <button 
              onClick={copyToWhatsApp}
              className="w-full py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors text-[#25D366] font-bold flex items-center justify-center gap-2 text-sm border-t border-[#25D366]/20"
            >
              <MessageSquare className="w-4 h-4" />
              Copy for WhatsApp
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateHighlights}
            className="mt-6 w-full py-4 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/20 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <Wand2 className="w-5 h-5" />
            Generate AI Highlights
          </button>
        )}

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="mt-3 w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print Receipt
        </button>

        {/* Hidden receipt for printing */}
        <div id="receipt-text" className="print-only">
          {receiptContent}
        </div>
      </div>
    </div>
  );
};

export default MatchDetailModal;
