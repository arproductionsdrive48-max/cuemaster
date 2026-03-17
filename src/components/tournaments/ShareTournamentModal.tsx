import React from 'react';
import { X, Copy, MessageCircle, Send, Facebook, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tournament } from '@/types';

interface ShareTournamentModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
}

const ShareTournamentModal = ({ tournament, isOpen, onClose }: ShareTournamentModalProps) => {
  if (!isOpen) return null;

  const tournamentDate = tournament.date instanceof Date 
    ? tournament.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Upcoming';

  const shareText = `🏆 ${tournament.name}\n📅 ${tournamentDate}\n📍 ${tournament.location}\n💰 Entry: ₹${tournament.entryFee}\n\nRegister now at Snook OS!`;
  const encodedText = encodeURIComponent(shareText);
  const shareUrl = window.location.href; // Or a specific tournament URL if available

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366]',
      hover: 'hover:bg-[#128C7E]',
      url: `https://wa.me/?text=${encodedText}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-[#0088cc]',
      hover: 'hover:bg-[#0077b5]',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodedText}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2]',
      hover: 'hover:bg-[#0d65d9]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodedText}`,
    },
  ];

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Tournament details copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy. Please try manually.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title: tournament.name,
          text: shareText,
          url: shareUrl
        });
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Share failed. Please use the options below.');
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="w-full max-w-sm glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5 bg-white/5">
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Share Tournament</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">Spread the word 🎱</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Preview */}
          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-[hsl(var(--gold))] uppercase tracking-widest mb-2">Message Preview</p>
            <pre className="text-xs text-gray-300 font-medium whitespace-pre-wrap leading-relaxed opacity-80">
              {shareText}
            </pre>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {shareOptions.map((option) => (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
                onClick={() => {
                   // No close here to let browser handle link
                }}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all transform group-hover:scale-110 group-active:scale-95 shadow-lg",
                  option.color,
                  option.hover
                )}>
                  <option.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">
                  {option.name}
                </span>
              </a>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all border border-white/10 active:scale-[0.98]"
            >
              <Copy className="w-4 h-4 text-[hsl(var(--gold))]" />
              Copy Message
            </button>

            {navigator.share && window.isSecureContext && (
              <button
                onClick={handleNativeShare}
                className="w-full py-4 rounded-2xl bg-[hsl(var(--gold))] text-black font-extrabold text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-[hsl(var(--gold))]/20 active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4" />
                Other Apps
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 text-center border-t border-white/5">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Snook OS × {tournament.location}</p>
        </div>
      </div>
    </div>
  );
};

export default ShareTournamentModal;
