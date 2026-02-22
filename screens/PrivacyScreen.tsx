import { ArrowLeft, Shield, Eye, Database, Lock, Bell, Share2 } from 'lucide-react';

interface PrivacyScreenProps {
  onBack: () => void;
}

const PrivacyScreen = ({ onBack }: PrivacyScreenProps) => {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="pt-6 pb-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Privacy & Security</h1>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Introduction */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Your Privacy Matters</h2>
              <p className="text-sm text-muted-foreground">Last updated: December 2024</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Snook OS is committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data.
          </p>
        </div>

        {/* Data Collection */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Data We Collect</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong className="text-foreground">Account Information:</strong> Name, email, phone number for membership management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong className="text-foreground">Usage Data:</strong> Table bookings, game history, and preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong className="text-foreground">Payment Information:</strong> Transaction records for billing purposes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong className="text-foreground">CCTV Footage:</strong> Recorded for security purposes only</span>
            </li>
          </ul>
        </div>

        {/* How We Use Data */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">How We Use Your Data</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-available mt-1">✓</span>
              <span>Manage your membership and bookings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-available mt-1">✓</span>
              <span>Process payments and maintain billing records</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-available mt-1">✓</span>
              <span>Send important notifications and reminders</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-available mt-1">✓</span>
              <span>Improve our services and user experience</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-available mt-1">✓</span>
              <span>Ensure safety and security of our premises</span>
            </li>
          </ul>
        </div>

        {/* Security Measures */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Security Measures</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We implement industry-standard security practices to protect your data:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>End-to-end encryption for all sensitive data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Secure cloud storage with regular backups</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regular security audits and updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Staff training on data protection</span>
            </li>
          </ul>
        </div>

        {/* Permissions */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">App Permissions</h3>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Camera</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">For QR scanning</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Notifications</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">Booking reminders</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Storage</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">Save receipts</span>
            </li>
          </ul>
        </div>

        {/* Data Sharing */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Data Sharing</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell your personal information. We may share data only with:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mt-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Payment processors for transactions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Law enforcement when legally required</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about your privacy?
          </p>
          <p className="font-semibold mt-1">privacy@snookos.app</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyScreen;
