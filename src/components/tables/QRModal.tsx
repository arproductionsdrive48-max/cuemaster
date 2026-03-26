import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Printer, Copy, Check, Loader2, QrCode } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const initToken = async () => {
      try {
        setError(null);
        const data = await generateToken(table.id);
        // The DB auto-generates the `token` UUID column via DEFAULT gen_random_uuid()
        // The hook does .select().single() so data is the full row
        setToken(data.token);
      } catch (err: any) {
        console.error('[Snook OS] QRModal: failed to generate token:', err);
        setError(err?.message ?? 'Failed to generate QR token');
      }
    };
    initToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.id]);

  const qrValue = token
    ? `https://snookospublic.vercel.app/start-table?table=${table.tableNumber}&token=${token}`
    : '';

  const handleCopy = async () => {
    if (!qrValue) return;
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
    .table-name { font-size: 32px; font-weight: 800; color: #111; margin-bottom: 4px; }
    .table-type { font-size: 15px; color: #666; margin-bottom: 28px; }
    img { width: 280px; height: 280px; display: block; margin: 0 auto 24px; }
    .instructions { font-size: 14px; color: #555; line-height: 1.5; max-width: 260px; margin: 0 auto; }
    .expires { font-size: 11px; color: #aaa; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="club-label">Snook OS</p>
    <h1 class="table-name">Table ${String(table.tableNumber).padStart(2, '0')}</h1>
    <p class="table-type">${table.tableType || 'Snooker'}</p>
    <img src="${url}" alt="QR Code" />
    <p class="instructions">Scan this QR code to instantly start your session or join the waitlist — no app required.</p>
    <p class="expires">Token valid for 30 minutes from generation</p>
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
          'relative w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center animate-scale-in',
          'bg-[#0f0f0f] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Table {String(table.tableNumber).padStart(2, '0')} QR
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">{table.tableType || 'Snooker'} · Token expires in 30 min</p>

        {/* QR Code */}
        <div className="relative rounded-2xl p-5 bg-white shadow-[0_0_48px_rgba(52,211,153,0.25)] mb-6">
          {isPending || !token ? (
            <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-xl">
              {error ? (
                <p className="text-red-500 text-xs px-4 text-center">{error}</p>
              ) : (
                <>
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-xs text-gray-400">Generating token…</p>
                </>
              )}
            </div>
          ) : (
            <QRCodeCanvas
              ref={qrRef}
              value={qrValue}
              size={200}
              level="H"
              includeMargin={false}
            />
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-gray-500 mb-6 leading-relaxed px-2">
          Print this QR and stick on table. Players scan to start session or join waitlist.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 w-full mb-3">
          <button
            onClick={handleDownload}
            disabled={!token}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handlePrint}
            disabled={!token}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            Print QR
          </button>
          <button
            onClick={handleCopy}
            disabled={!token}
            className={cn(
              'flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed',
              copied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
