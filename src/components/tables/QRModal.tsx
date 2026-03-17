import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Printer, Copy, Check, Loader2 } from 'lucide-react';
import { TableSession } from '@/types';
import { useGenerateQRToken } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';

interface QRModalProps {
  table: TableSession;
  onClose: () => void;
}

const QRModal = ({ table, onClose }: QRModalProps) => {
  const { clubId } = useMembers();
  const { mutateAsync: generateToken, isPending } = useGenerateQRToken(clubId);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const initToken = async () => {
      try {
        const data = await generateToken(table.id);
        setToken(data.token);
      } catch (err) {
        console.error('Failed to generate initial token:', err);
      }
    };
    initToken();
  }, [table.id, generateToken]);

  const qrValue = token 
    ? `https://snookospublic.vercel.app/start-table?table=${table.tableNumber}&token=${token}`
    : '';

  const handleCopy = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `table-${table.tableNumber}-qr.png`;
    link.href = url;
    link.click();
    toast.success('QR Code downloaded');
  };

  const handlePrint = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current;
    const url = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - Table ${table.tableNumber}</title>
          <style>
            body { 
              font-family: sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              text-align: center;
            }
            .container { padding: 40px; border: 2px solid #000; border-radius: 20px; }
            h1 { margin-bottom: 10px; font-size: 24px; }
            h2 { margin-top: 0; color: #666; font-size: 18px; }
            img { width: 300px; height: 300px; margin: 20px 0; }
            p { font-size: 14px; color: #888; max-width: 300px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Table ${table.tableNumber}</h1>
            <h2>${table.tableType || 'Snooker'}</h2>
            <img src="${url}" />
            <p>Scan to start your session or join the waitlist at Snook OS</p>
          </div>
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md" onClick={onClose}>
      <div 
        className="relative w-full max-w-sm glass-card p-8 animate-scale-in flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">Table {table.tableNumber} QR</h2>
          <p className="text-sm text-muted-foreground">{table.tableType} Table</p>
        </div>

        {/* QR Code Container */}
        <div className="relative p-6 rounded-3xl bg-white mb-6 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
          {isPending || !token ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center bg-secondary/20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <QRCodeCanvas
              ref={qrRef}
              value={qrValue}
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: "/logo.png", // Fallback if exists
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground mb-8 leading-relaxed px-4">
          Print this QR and stick on table. Players scan to start session or join waitlist instantly.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={!token}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-accent transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handlePrint}
            disabled={!token}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-accent transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleCopy}
            disabled={!token}
            className={cn(
              "col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-sm font-bold",
              copied ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Public Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
