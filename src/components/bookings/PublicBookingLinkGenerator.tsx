import React from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface PublicBookingLinkGeneratorProps {
  clubId: string | null;
}

const PublicBookingLinkGenerator: React.FC<PublicBookingLinkGeneratorProps> = ({ clubId }) => {
  const copyClubLink = () => {
    const link = `https://snookospublic.vercel.app/book?club=${clubId || 'demo'}`;
    navigator.clipboard.writeText(link).catch(() => {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    toast.success('Club booking page link copied!', {
      description: 'Share this with customers so they can self-book online.',
    });
  };

  return (
    <button
      onClick={copyClubLink}
      title="Copy general club booking page link"
      className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-500/60 transition-colors font-medium text-sm"
    >
      <Link2 className="w-4 h-4" />
      Copy Club Booking Page Link
    </button>
  );
};

export default PublicBookingLinkGenerator;
