// CCTVScreen has been removed from the app
import Header from '@/components/layout/Header';

const CCTVScreen = () => {
  return (
    <div className="min-h-screen pb-24">
      <Header title="CCTV Monitoring" />
      <div className="px-4">
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">CCTV feature has been removed.</p>
        </div>
      </div>
    </div>
  );
};

export default CCTVScreen;
