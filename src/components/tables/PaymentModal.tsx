import { useState } from 'react';
import { TableSession } from '@/types';
import { X, IndianRupee, CheckCircle, Users, QrCode, Copy, Check, CreditCard, Banknote, Wand2, Loader2, Share2, Printer, MessageSquare, Receipt, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';
import { mlService } from '@/services/mlService';
import { toast } from 'sonner';
import { generateReceiptText } from '@/lib/billing';

interface PaymentModalProps {
  table: TableSession;
  onClose: () => void;
  onConfirm: (paymentInfo?: { paymentMethod: string; splitCount: number; qrUsed: boolean }) => void;
}

const PaymentModal = ({ table, onClose, onConfirm }: PaymentModalProps) => {
  const [splitCount, setSplitCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const { clubSettings } = useMembers();

  // Smart Gen State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [mlLoadingMsg, setMlLoadingMsg] = useState('');
  const [viewMode, setViewMode] = useState<'success' | 'highlights' | 'receipt'>('success');
  const [lastGenType, setLastGenType] = useState<'highlights' | 'receipt' | null>(null);

  const splitAmount = Math.ceil(table.totalBill / splitCount);
  const UPI_ID = 'snookos@upi';

  const handleCopy = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    if (processing) return;
    setProcessing(true);
    
    // Call onConfirm immediately to sync with DB
    onConfirm({
      paymentMethod,
      splitCount,
      qrUsed: paymentMethod === 'upi',
    });

    // Show success view after a tiny "processing" feel
    setTimeout(() => {
      setConfirmed(true);
      setProcessing(false);
    }, 600);
  };

  const handleGenerateHighlights = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setViewMode('highlights');
    
    const unsubscribe = mlService.onProgress((info) => {
      if (info.status === 'init' || info.status === 'downloading') {
        const percent = info.progress ? Math.round(info.progress) : 0;
        setMlLoadingMsg(`Downloading AI assistant (~300 MB, one-time)... ${percent > 0 ? percent + '%' : ''}`);
      } else if (info.status === 'done') {
        setMlLoadingMsg('Generator ready!');
      }
    });

    try {
      const winnersMap = (table as any)._winnersMap || {};
      const winners = Object.entries(winnersMap)
        .filter(([_, result]) => result === 'win')
        .map(([name]) => name);
      const winnerText = winners.length > 0 ? winners.join(' & ') : '';

      const players = table.players.join(' & ');
      const prompt = `You are a hype-man sports commentator.
Task: Write a 1-sentence WhatsApp highlight text for a snooker match played by ${players}.
${winnerText ? `Explicitly mention that ${winnerText} won the match.` : 'The match was a close draw.'}
Rules:
- Keep it under 20 words.
- Include 1 fire emoji.
- Example: "Epic match! Amit takes down Rahul 4-2 on Table 8! \uD83D\uDD25"`;

      const result = await mlService.generateText(
        prompt, 
        `Write WhatsApp commentary for ${players}'s match. ${winnerText ? winnerText + ' won.' : 'It was a draw.'}`, 
        40,
        'commentary',
        { players, tableNum: table.tableNumber, winner: winnerText }
      );

      const vsHeader = `*${table.players.join(' vs ')} (Table ${table.tableNumber})*\n\n`;
      setGeneratedText(vsHeader + result);
      setLastGenType('highlights');
    } catch (err) {
      toast.error('Failed to generate highlights offline');
    } finally {
      setIsGenerating(false);
      setMlLoadingMsg('');
      unsubscribe();
    }
  };

  const handleGenerateReceipt = () => {
    setViewMode('receipt');
    const receipt = generateReceiptText(
      clubSettings.clubName,
      table.tableNumber,
      table.tableType || 'Snooker',
      table.startTime ? new Date(table.startTime) : null,
      new Date(),
      table.startTime ? Date.now() - new Date(table.startTime).getTime() : 0,
      table.totalBill,
      paymentMethod,
      table.items
    );
    
    setGeneratedText(receipt);
    setLastGenType('receipt');
  };

  const copyToWhatsApp = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedText);
      } else {
        // Fallback for non-HTTPS or older browsers
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
    window.print();
  };

  if (confirmed) {
    return (
      <div className="modal-overlay animate-fade-in-up">
        <div
          className="absolute inset-x-4 top-[10%] bottom-[10%] rounded-3xl glass-card p-6 animate-scale-in flex flex-col justify-between"
        >
          {viewMode === 'success' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-available/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-available" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Confirmed!</h2>
              <p className="text-muted-foreground mb-8">Table {table.tableNumber} is now free</p>

              <div className="w-full space-y-3">
                <button 
                  onClick={handleGenerateHighlights}
                  className="w-full py-4 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] font-bold flex items-center justify-center gap-2 hover:bg-[hsl(var(--gold))]/20 transition-all"
                >
                  <Wand2 className="w-5 h-5" />
                  {lastGenType === 'highlights' ? 'Regenerate Highlights' : 'Generate Highlights Text'}
                </button>
                <button 
                  onClick={handleGenerateReceipt}
                  className="w-full py-4 rounded-xl bg-secondary border border-border text-foreground font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                >
                  <Printer className="w-5 h-5" />
                  Make Receipt Text
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{viewMode === 'highlights' ? 'Match Commentary' : 'Session Receipt'}</h2>
                <button
                  onClick={() => setViewMode('success')}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="w-8 h-8 text-[hsl(var(--gold))] animate-spin" />
                  <p className="text-sm font-medium animate-pulse">{mlLoadingMsg}</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar print:overflow-visible">
                  <div 
                    id="receipt-text"
                    className="w-full h-full bg-[#121212] rounded-2xl p-4 border border-white/10 font-mono text-sm whitespace-pre-wrap text-emerald-400 print:text-black print:bg-white print:border-none print:p-0"
                  >
                    {generatedText}
                  </div>
                </div>
              )}

              {!isGenerating && generatedText && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                  <button 
                    onClick={copyToWhatsApp}
                    className="py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-bold flex items-center justify-center gap-2 text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Copy for WA
                  </button>
                  {viewMode === 'highlights' ? (
                    <button 
                      onClick={handleGenerateHighlights}
                      className="py-3 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      <Wand2 className="w-4 h-4" />
                      Regenerate
                    </button>
                  ) : viewMode === 'receipt' && (
                    <button 
                      onClick={handlePrint}
                      className="py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-full mt-4 py-4 rounded-xl font-bold text-muted-foreground hover:text-white transition-colors"
          >
            Close & Return to Tables
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay animate-fade-in-up" onClick={onClose}>
      <div
        className="absolute inset-x-4 top-20 bottom-28 overflow-hidden rounded-3xl glass-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-xl font-bold">Payment</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-80px)] no-scrollbar p-4 space-y-6">
          {/* Bill Summary */}
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-3">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Table {table.tableNumber} Charges</span>
                <span>₹{table.totalBill - table.items.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
              </div>
              {table.items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-border/50 text-xl font-bold">
                <span>Total</span>
                <div className="flex items-center gap-1 text-primary">
                  <IndianRupee className="w-5 h-5" />
                  <span>{table.totalBill}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'upi' as const, label: 'UPI/QR', icon: QrCode },
                { id: 'cash' as const, label: 'Cash', icon: Banknote },
                { id: 'card' as const, label: 'Card', icon: CreditCard },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={cn(
                    'py-3 px-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1.5',
                    paymentMethod === m.id
                      ? 'bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <m.icon className="w-5 h-5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {/* Hidden receipt for printing */}
          <div id="receipt-text" className="print-only">
            {generatedText}
          </div>

          {/* Split Bill */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Split Bill</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setSplitCount(num)}
                    className={cn(
                      'w-9 h-9 rounded-xl font-semibold transition-all',
                      splitCount === num
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            {splitCount > 1 && (
              <p className="text-center text-muted-foreground">
                Each person pays: <span className="text-foreground font-bold">₹{splitAmount}</span>
              </p>
            )}
          </div>

          {/* QR Code - only show for UPI */}
          {paymentMethod === 'upi' && (
            <div className="glass-card p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Scan to Pay</span>
              </div>
              
              <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-white p-2">
                <img 
                  src={clubSettings.upiQrCode} 
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 mx-auto mt-4 px-4 py-2 rounded-xl bg-secondary text-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-available" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{UPI_ID}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={processing}
            className={cn(
              "w-full btn-premium flex items-center justify-center gap-2 py-4",
              processing && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCircle className="w-5 h-5" />
            {processing ? 'Processing...' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
