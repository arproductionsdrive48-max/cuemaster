import React from 'react';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface PublicBookingLinkGeneratorProps {
  clubId: string | null;
  tableNumber?: number;
}

const PublicBookingLinkGenerator: React.FC<PublicBookingLinkGeneratorProps> = ({ clubId, tableNumber }) => {
  const copyPublicLink = () => {
    let link = `${window.location.origin}/book/${clubId || 'demo'}`;
    if (tableNumber) link += `?table=${tableNumber}`;
    navigator.clipboard.writeText(link);
    toast.success('Public booking link copied to clipboard!');
  };

  return (
    <button onClick={copyPublicLink} className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/50 transition-colors font-medium">
      <MapPin className="w-4 h-4" /> Copy Public Link {tableNumber ? `(T${tableNumber})` : ''}
    </button>
  );
};

export default PublicBookingLinkGenerator;
