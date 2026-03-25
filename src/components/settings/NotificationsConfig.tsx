import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Bell, CheckCircle2, AlertCircle, Send, Eye, EyeOff, Save, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface NotificationConfigData {
  twilio_sid?: string;
  twilio_token?: string;
  twilio_phone?: string;
  sendgrid_api_key?: string;
  sendgrid_from_email?: string;
  firebase_project_id?: string;
  firebase_service_account_json?: string;
}

interface NotificationsConfigProps {
  clubId: string | null;
}

// ─── Helper: masked display for saved secrets ─────────────────────────────────
const maskSecret = (val: string | undefined) =>
  val ? '••••••••••••' + val.slice(-4) : '';

// ─── Sub-component: Status badge ─────────────────────────────────────────────
const StatusBadge = ({ configured }: { configured: boolean }) => (
  <span className={cn(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
    configured
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
      : 'bg-gray-700/60 text-gray-400 border border-white/10'
  )}>
    {configured
      ? <><CheckCircle2 className="w-2.5 h-2.5" /> Connected</>
      : <><AlertCircle className="w-2.5 h-2.5" /> Not Configured</>
    }
  </span>
);

// ─── Sub-component: Secret input ─────────────────────────────────────────────
const SecretInput = ({
  label, placeholder, value, onChange, helperText,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; helperText?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pr-10 px-3 py-2.5 rounded-xl bg-[#111] border border-white/8 text-white placeholder:text-gray-600 outline-none focus:border-white/20 transition-colors text-sm font-mono"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {helperText && <p className="mt-1 text-[10px] text-gray-600">{helperText}</p>}
    </div>
  );
};

// ─── Sub-component: Plain input ──────────────────────────────────────────────
const PlainInput = ({
  label, placeholder, value, onChange, type = 'text', helperText,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; helperText?: string;
}) => (
  <div>
    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl bg-[#111] border border-white/8 text-white placeholder:text-gray-600 outline-none focus:border-white/20 transition-colors text-sm"
    />
    {helperText && <p className="mt-1 text-[10px] text-gray-600">{helperText}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const NotificationsConfig: React.FC<NotificationsConfigProps> = ({ clubId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'sms' | 'email' | 'push' | null>(null);

  // Form fields — never pre-fill secret tokens after first save
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [sgKey, setSgKey] = useState('');
  const [sgFrom, setSgFrom] = useState('');
  const [fbProject, setFbProject] = useState('');
  const [fbJson, setFbJson] = useState('');

  // Masked saved state for status badges
  const [saved, setSaved] = useState({
    twilio: false,
    sendgrid: false,
    firebase: false,
  });

  useEffect(() => {
    if (!clubId || !supabase) { setLoading(false); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from('notification_config')
          .select('*')
          .eq('club_id', clubId)
          .maybeSingle();

        if (data) {
          // Populate non-secret fields directly; keep secrets masked
          setTwilioPhone(data.twilio_phone || '');
          setSgFrom(data.sendgrid_from_email || '');
          setFbProject(data.firebase_project_id || '');
          setSaved({
            twilio: !!(data.twilio_sid && data.twilio_token && data.twilio_phone),
            sendgrid: !!(data.sendgrid_api_key && data.sendgrid_from_email),
            firebase: !!(data.firebase_project_id),
          });
        }
      } catch {
        // no config yet — fresh start
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId]);

  const handleSave = async () => {
    if (!clubId) { toast.error('No club found'); return; }
    if (!supabase) { toast.error('Database not connected'); return; }
    setSaving(true);
    try {
      const payload: NotificationConfigData & { club_id: string; updated_at: string } = {
        club_id: clubId,
        updated_at: new Date().toISOString(),
        twilio_phone: twilioPhone || undefined,
        sendgrid_from_email: sgFrom || undefined,
        firebase_project_id: fbProject || undefined,
      };

      // Only include secrets if the user typed new values (non-empty)
      if (twilioSid) payload.twilio_sid = twilioSid;
      if (twilioToken) payload.twilio_token = twilioToken;
      if (sgKey) payload.sendgrid_api_key = sgKey;
      if (fbJson) payload.firebase_service_account_json = fbJson;

      const { error } = await supabase!
        .from('notification_config')
        .upsert(payload, { onConflict: 'club_id' });

      if (error) throw error;

      // Clear secret fields after save for security
      setTwilioSid(''); setTwilioToken(''); setSgKey(''); setFbJson('');
      setSaved({
        twilio: !!(twilioSid && twilioToken && twilioPhone),
        sendgrid: !!(sgKey && sgFrom),
        firebase: !!(fbProject),
      });
      toast.success('Notification settings saved securely!', {
        description: 'Keys are stored in your database. One-time setup complete.',
      });
    } catch (err: any) {
      toast.error('Failed to save: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type: 'sms' | 'email' | 'push') => {
    if (!clubId || !supabase) return;
    setTesting(type);
    try {
      const fnName = type === 'sms' ? 'send_test_sms' : type === 'email' ? 'send_test_email' : 'send_test_push';
      const { error } = await supabase.functions.invoke(fnName, { body: { club_id: clubId } });
      if (error) throw error;
      toast.success(`Test ${type.toUpperCase()} sent successfully! Check your phone/inbox.`);
    } catch (err: any) {
      toast.error(`Test failed: ${err?.message || 'Edge function not deployed yet'}`, {
        description: 'Deploy the Supabase edge function first.',
      });
    } finally {
      setTesting(null);
    }
  };

  const handleFbJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setFbJson(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
    </div>
  );

  // ─── Card wrapper ─────────────────────────────────────────────────────────
  const Card = ({ icon, color, title, badge, children }: {
    icon: React.ReactNode; color: string; title: string; badge: boolean; children: React.ReactNode;
  }) => (
    <div className="bg-[#141414] border border-white/8 rounded-2xl overflow-hidden">
      <div className={`p-4 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r ${color}`}>
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-bold text-white text-sm">{title}</p>
        </div>
        <StatusBadge configured={badge} />
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/15 rounded-2xl p-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-white font-semibold">One-time setup only.</span> These settings are saved securely to your database. SMS, Email, and Push notifications will work automatically after saving. Do not share these keys with anyone.
        </p>
      </div>

      {/* SMS — Twilio */}
      <Card
        icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
        color="from-emerald-500/5 to-transparent"
        title="SMS via Twilio"
        badge={saved.twilio}
      >
        <SecretInput label="Account SID" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioSid} onChange={setTwilioSid} helperText="Found in your Twilio Console dashboard" />
        <SecretInput label="Auth Token" placeholder="Enter Auth Token" value={twilioToken} onChange={setTwilioToken} helperText="Keep this private — never share it" />
        <PlainInput label="Twilio Phone Number" placeholder="+91xxxxxxxxxx" value={twilioPhone} onChange={setTwilioPhone} type="tel" helperText="The number your customers will receive SMS from" />
        <button
          onClick={() => handleTest('sms')}
          disabled={testing === 'sms' || !saved.twilio}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-colors disabled:opacity-40"
        >
          {testing === 'sms' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Test SMS
        </button>
      </Card>

      {/* Email — SendGrid */}
      <Card
        icon={<Mail className="w-4 h-4 text-blue-400" />}
        color="from-blue-500/5 to-transparent"
        title="Email via SendGrid"
        badge={saved.sendgrid}
      >
        <SecretInput label="SendGrid API Key" placeholder="SG.xxxxxxxxxxxxxxxxxxxx" value={sgKey} onChange={setSgKey} helperText="Create an API key in your SendGrid account settings" />
        <PlainInput label="From Email Address" placeholder="bookings@yourclub.com" value={sgFrom} onChange={setSgFrom} type="email" helperText="The email address customers will see in the From field" />
        <button
          onClick={() => handleTest('email')}
          disabled={testing === 'email' || !saved.sendgrid}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-colors disabled:opacity-40"
        >
          {testing === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Test Email
        </button>
      </Card>

      {/* Push — Firebase */}
      <Card
        icon={<Bell className="w-4 h-4 text-amber-400" />}
        color="from-amber-500/5 to-transparent"
        title="Push Notifications via Firebase FCM"
        badge={saved.firebase}
      >
        <PlainInput label="Firebase Project ID" placeholder="your-project-id" value={fbProject} onChange={setFbProject} helperText="Found in Firebase Console → Project Settings" />
        <div>
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 block">Service Account JSON</label>
          <label className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#111] border border-dashed border-white/10 hover:border-white/20 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-400 truncate">
              {fbJson ? '✓ JSON file loaded — will be saved' : 'Upload serviceAccountKey.json'}
            </span>
            <input type="file" accept=".json" onChange={handleFbJsonUpload} className="hidden" />
          </label>
          <p className="mt-1 text-[10px] text-gray-600">Download from Firebase → Project Settings → Service Accounts → Generate new private key</p>
        </div>
        <button
          onClick={() => handleTest('push')}
          disabled={testing === 'push' || !saved.firebase}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold transition-colors disabled:opacity-40"
        >
          {testing === 'push' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Test Push
        </button>
      </Card>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-violet-900/30 active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving Securely...' : 'Save Notification Settings'}
      </button>
    </div>
  );
};

export default NotificationsConfig;
