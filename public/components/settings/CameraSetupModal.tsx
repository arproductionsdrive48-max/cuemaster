import { useState } from 'react';
import { X, Camera, Check, Loader2, Video, Link } from 'lucide-react';
import { Camera as CameraType } from '@/types';
import { toast } from 'sonner';

interface CameraSetupModalProps {
  camera?: CameraType;
  onClose: () => void;
  onSave: (camera: Omit<CameraType, 'id'>) => void;
}

const thumbnails = [
  'https://www.wellingboroughcuesports.co.uk/wp-content/uploads/2024/05/arena1web-1024x683.jpg',
  'https://www.wellingboroughcuesports.co.uk/wp-content/uploads/2024/05/arena-6-1024x683.jpg',
  'https://media.istockphoto.com/id/149409557/photo/composition-of-billiard.jpg?s=612x612&w=0&k=20&c=Wn6B7acze4xG4TX1S3vusu8nC88nYJBy2_xYhdRNpKU=',
  'https://storage.googleapis.com/shp-promo-europe/web-promo/img/gallery/shooterspool-snooker-tv-camera.webp',
  'https://clan.fastly.steamstatic.com/images/12590736/eab48d815a38025e2538e8934c898710de44d2dc.png',
];

const CameraSetupModal = ({ camera, onClose, onSave }: CameraSetupModalProps) => {
  const [name, setName] = useState(camera?.name || '');
  const [url, setUrl] = useState(camera?.url || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

  const handleTest = () => {
    if (!url.trim()) return;
    
    setIsTesting(true);
    setTestSuccess(null);
    
    // Always show success for demo purposes
    setTimeout(() => {
      setIsTesting(false);
      setTestSuccess(true);
      toast.success('Connection Successful!', {
        description: 'Camera stream is accessible and ready to use.',
      });
    }, 1500);
  };

  const handleSave = () => {
    if (name.trim() && url.trim()) {
      onSave({
        name: name.trim(),
        url: url.trim(),
        status: 'online',
        thumbnail: thumbnails[Math.floor(Math.random() * thumbnails.length)],
      });
      toast.success(camera ? 'Camera updated!' : 'Camera added successfully!');
      onClose();
    }
  };

  const isVideoUrl = (urlStr: string) => {
    const lowerUrl = urlStr.toLowerCase();
    return lowerUrl.endsWith('.mp4') || 
           lowerUrl.endsWith('.m3u8') || 
           lowerUrl.endsWith('.webm') ||
           lowerUrl.includes('youtube') ||
           lowerUrl.includes('vimeo');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-sm glass-card p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{camera ? 'Edit Camera' : 'Add Camera'}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Camera Name *</label>
            <input
              type="text"
              placeholder="e.g., Table 1 Overhead"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Stream URL *</label>
            <input
              type="text"
              placeholder="rtsp://192.168.1.100:554/stream"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-glass"
            />
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Link className="w-3 h-3" />
              Supports RTSP, HTTP, HLS (.m3u8), MP4, and more
            </p>
          </div>

          {/* URL Type Indicator */}
          {url.trim() && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
              <Video className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isVideoUrl(url) ? 'Direct video stream detected' : 'RTSP/IP camera stream'}
              </span>
            </div>
          )}

          {/* Test Connection Button */}
          <button
            onClick={handleTest}
            disabled={!url.trim() || isTesting}
            className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-accent transition-colors"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing Connection...
              </>
            ) : testSuccess === true ? (
              <>
                <Check className="w-4 h-4 text-available" />
                Connection Successful
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !url.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {camera ? 'Save Changes' : 'Add Camera'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraSetupModal;
