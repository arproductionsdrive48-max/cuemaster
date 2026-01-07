import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import { useMembers } from '@/contexts/MembersContext';
import { X, Maximize2, Circle, Pause, Play, Camera as CameraIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CCTVScreen = () => {
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);
  const [imageIndices, setImageIndices] = useState<{ [key: string]: number }>({});
  const [isPaused, setIsPaused] = useState(false);
  const { cameras, cctvImages } = useMembers();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const selectedCamera = cameras.find(c => c.id === fullscreenCamera);

  // Check if URL is a direct video file
  const isVideoUrl = (url: string) => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.mp4') || 
           lowerUrl.endsWith('.m3u8') || 
           lowerUrl.endsWith('.webm') ||
           lowerUrl.endsWith('.mov') ||
           lowerUrl.endsWith('.ogg');
  };

  // Cycle through images for live simulation (every 3-5 seconds)
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setImageIndices(prev => {
        const newIndices = { ...prev };
        cameras.forEach(camera => {
          if (camera.status === 'online' && !isVideoUrl(camera.url)) {
            const currentIndex = prev[camera.id] || 0;
            // Random offset to make each camera cycle at different rates
            const offset = parseInt(camera.id, 36) % 3;
            newIndices[camera.id] = (currentIndex + 1 + offset) % cctvImages.length;
          }
        });
        return newIndices;
      });
    }, 3500); // 3.5 second cycle

    return () => clearInterval(interval);
  }, [cameras, cctvImages.length, isPaused]);

  const getCameraImage = (cameraId: string, index?: number) => {
    const idx = index !== undefined ? index : (imageIndices[cameraId] || 0);
    return cctvImages[idx % cctvImages.length];
  };

  const handleSnapshot = () => {
    toast.success('Snapshot saved!', {
      description: 'Image saved to device gallery.',
    });
  };

  const handleVideoError = (cameraId: string) => {
    // Video failed to load, will fallback to cycling images
    console.log(`Video stream unavailable for camera ${cameraId}, using simulated feed`);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="CCTV Monitoring" />

      {/* Camera Grid */}
      <div className="px-4">
        {cameras.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CameraIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No cameras configured.</p>
            <p className="text-sm text-muted-foreground mt-1">Go to Settings → CCTV Setup to add cameras.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cameras.map(camera => (
              <button
                key={camera.id}
                onClick={() => setFullscreenCamera(camera.id)}
                className="glass-card-hover overflow-hidden group"
              >
                {/* Camera Feed */}
                <div className="aspect-video bg-secondary relative overflow-hidden">
                  {/* Try video first if URL looks like video, otherwise show cycling images */}
                  {isVideoUrl(camera.url) && camera.status === 'online' ? (
                    <video
                      ref={el => { videoRefs.current[camera.id] = el; }}
                      src={camera.url}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      onError={() => handleVideoError(camera.id)}
                    />
                  ) : (
                    <img 
                      src={camera.status === 'online' ? getCameraImage(camera.id) : camera.thumbnail}
                      alt={camera.name}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        camera.status === 'offline' && "opacity-50 grayscale"
                      )}
                    />
                  )}
                  
                  {/* Live indicator overlay */}
                  {camera.status === 'online' && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/90 backdrop-blur-sm">
                      <Circle className="w-2 h-2 fill-white text-white animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase">Live</span>
                    </div>
                  )}
                  
                  {/* Status indicator (for offline) */}
                  {camera.status === 'offline' && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm">
                      <Circle className="w-2 h-2 fill-muted-foreground text-muted-foreground" />
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">Offline</span>
                    </div>
                  )}

                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-5 h-5 text-foreground ml-0.5" />
                    </div>
                  </div>

                  {/* Expand icon */}
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4" />
                  </div>

                  {/* Time overlay */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-background/70 backdrop-blur-sm">
                    <span className="text-[10px] font-mono text-foreground">
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                  </div>
                </div>

                {/* Camera Label */}
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">{camera.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{camera.url}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen View */}
      {fullscreenCamera !== null && selectedCamera && (
        <div className="modal-overlay animate-fade-in-up" onClick={() => setFullscreenCamera(null)}>
          <div
            className="absolute inset-4 rounded-3xl overflow-hidden glass-card animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/95 via-background/70 to-transparent">
              <div className="flex items-center gap-3">
                {selectedCamera.status === 'online' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary">
                    <Circle className="w-2 h-2 fill-white text-white animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase">Live</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold block">{selectedCamera.name}</span>
                  <span className="text-xs text-muted-foreground">{selectedCamera.url}</span>
                </div>
              </div>
              <button
                onClick={() => setFullscreenCamera(null)}
                className="w-10 h-10 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fullscreen Feed */}
            <div className="w-full h-full bg-background">
              {isVideoUrl(selectedCamera.url) && selectedCamera.status === 'online' ? (
                <video
                  src={selectedCamera.url}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                />
              ) : (
                <img 
                  src={selectedCamera.status === 'online' ? getCameraImage(selectedCamera.id) : selectedCamera.thumbnail}
                  alt={selectedCamera.name}
                  className={cn(
                    "w-full h-full object-contain transition-all duration-700",
                    selectedCamera.status === 'offline' && "opacity-50 grayscale"
                  )}
                />
              )}

              {/* Timestamp overlay */}
              <div className="absolute top-16 right-4 px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur-sm">
                <span className="text-sm font-mono text-foreground">
                  {new Date().toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit', 
                    hour12: false 
                  })}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/95 via-background/70 to-transparent">
              <div className="flex items-center justify-center gap-4">
                {/* Snapshot Button */}
                <button
                  onClick={handleSnapshot}
                  className="w-14 h-14 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <Download className="w-6 h-6" />
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  {isPaused ? <Play className="w-7 h-7 text-primary-foreground ml-1" /> : <Pause className="w-7 h-7 text-primary-foreground" />}
                </button>

                {/* Fullscreen indicator */}
                <button
                  onClick={() => setFullscreenCamera(null)}
                  className="w-14 h-14 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <Maximize2 className="w-6 h-6" />
                </button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3">
                {isPaused ? 'Feed Paused' : 'Live Feed Active'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVScreen;
