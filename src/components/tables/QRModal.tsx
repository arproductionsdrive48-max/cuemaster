import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Printer, Copy, Check, QrCode } from 'lucide-react';
import { TableSession } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QRModalProps {
  table: TableSession;
  onClose: () => void;
}

const QRModal = ({ table, onClose }: QRModalProps) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const qrValue = `https://snookospublic.vercel.app/start-table?table=${table.tableNumber}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(qrValue);
      } else {
        const ta = document.createElement('textarea');
        ta.value = qrValue;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      toast.success('Public link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const url = qrRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `table-${table.tableNumber}-qr.png`;
    link.href = url;
    link.click();
    toast.success('QR code downloaded!');
  };

  const handlePrint = () => {
    if (!qrRef.current) return;
    const url = qrRef.current.toDataURL('image/png');
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Code – Table ${table.tableNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh; background: #fff;
    }
    .card {
      border: 3px solid #111; border-radius: 24px; padding: 48px 40px;
      text-align: center; max-width: 380px; width: 100%;
    }
    .club-label { font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #888; margin-bottom: 6px; }
    .table-name { font-size: 32px; font-weight: 800; color: #111; margin-bottom: 2px; }
    .table-type { font-size: 15px; color: #666; margin-bottom: 28px; }
    img { width: 300px; height: 300px; display: block; margin: 0 auto 24px; }
    .instructions { font-size: 14px; color: #555; line-height: 1.5; max-width: 280px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="card">
    <p class="club-label">Snook OS</p>
    <h1 class="table-name">Table ${String(table.tableNumber).padStart(2, '0')}</h1>
    <p class="table-type">${table.tableType || 'Snooker'}</p>
    <img src="${url}" alt="QR Code" />
    <p class="instructions">Print this QR code and stick it permanently on the table. Players can scan it anytime to start a session or join the waitlist.</p>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`);
    pw.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-sm rounded-[32px] p-8 flex flex-col items-center text-center animate-scale-in',
          'bg-[#0f0f0f]/90 border border-white/10 shadow-[0_0_80px_rgba(16,185,129,0.15)] backdrop-blur-xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
          <QrCode className="w-6 h-6 text-emerald-400" />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1 mb-7">
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">
            QR for Table {table.tableNumber} - {table.tableType || 'Snooker'}
          </h2>
          <p className="text-xs font-medium text-emerald-500/70 tracking-[0.2em] uppercase">Permanent Static QR</p>
        </div>

        {/* QR Code Canvas */}
        <div className="relative rounded-[24px] p-6 bg-white shadow-[0_0_60px_rgba(52,211,153,0.3)] mb-8 transition-transform hover:scale-[1.02] duration-500">
          <QRCodeCanvas
            ref={qrRef}
            value={qrValue}
            size={220}
            level="H"
            includeMargin={false}
            imageSettings={{
                src: '/favicon.ico', // Optional: could add logo if it exists
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
            }}
          />
        </div>

        {/* Instructions Text */}
        <p className="text-sm text-gray-400 mb-8 leading-relaxed px-2 font-medium">
          Print this QR code and stick it permanently on the table. <span className="text-gray-300">Players can scan it anytime</span> to start a session or join the waitlist.
        </p>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <button
            onClick={handleDownload}
            className="group flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300 active:scale-[0.95]"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Download</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="group flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300 active:scale-[0.95]"
          >
            <Printer className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Print QR</span>
          </button>
          
          <button
            onClick={handleCopy}
            className={cn(
              'group flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all duration-300 active:scale-[0.95]',
              copied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400'
            )}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
