import { useState } from 'react';
import { TableSession } from '@/types';
import { X, IndianRupee, CheckCircle, Users, QrCode, Copy, Check, CreditCard, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';

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

  const splitAmount = Math.ceil(table.totalBill / splitCount);
  const UPI_ID = 'snookos@upi';

  const handleCopy = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    if (processing) return; // prevent double tap
    setProcessing(true);
    setConfirmed(true);
    setTimeout(() => {
      onConfirm({
        paymentMethod,
        splitCount,
        qrUsed: paymentMethod === 'upi',
      });
    }, 1500);
  };

  if (confirmed) {
    return (
      <div className="modal-overlay animate-fade-in-up" onClick={onClose}>
        <div
          className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-3xl glass-card p-8 text-center animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-20 h-20 rounded-full bg-available/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-available" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Confirmed!</h2>
          <p className="text-muted-foreground">Table {table.tableNumber} is now free</p>
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
