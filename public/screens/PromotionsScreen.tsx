import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Megaphone, Send, Plus, Users, Clock, X, WifiOff, Save, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useMembers } from '@/contexts/MembersContext';
import {
  usePromotions, useSendPromotion,
  usePromotionTemplates, useSavePromotionTemplate, useDeletePromotionTemplate,
} from '@/hooks/useSupabaseQuery';

const PromotionsScreen = () => {
  const { clubId, isOnline } = useMembers();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', channel: 'sms' });

  const { data: promotions = [], isLoading } = usePromotions(isOnline ? clubId : null);
  const { mutate: sbSend, isPending } = useSendPromotion(isOnline ? clubId : null);
  const { data: templates = [] } = usePromotionTemplates(isOnline ? clubId : null);
  const { mutate: saveTemplate, isPending: isSavingTemplate } = useSavePromotionTemplate(isOnline ? clubId : null);
  const { mutate: deleteTemplate } = useDeletePromotionTemplate(isOnline ? clubId : null);

  const audienceLabel = (a: string) =>
    a === 'all' ? 'All Members' : a === 'gold' ? 'Gold Members' : 'Guests';

  const handleSend = () => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    if (!form.title || !form.message) { toast.error('Please fill in title and message'); return; }
    sbSend(
      { title: form.title, message: form.message, audience: audienceLabel(form.audience), channel: form.channel.toUpperCase() },
      {
        onSuccess: () => {
          toast.success('Promotion sent & saved!');
          setForm({ title: '', message: '', audience: 'all', channel: 'sms' });
          setShowCreate(false);
        },
        onError: (err: any) => toast.error(err?.message || 'Failed to send promotion'),
      }
    );
  };

  const handleSaveTemplate = () => {
    if (!form.title || !form.message) { toast.error('Fill in title and message first'); return; }
    saveTemplate({
      title: form.title,
      message: form.message,
      audience: audienceLabel(form.audience),
      channel: form.channel.toUpperCase(),
    });
  };

  const loadTemplate = (template: typeof templates[0]) => {
    const audienceMap: Record<string, string> = { 'All Members': 'all', 'Gold Members': 'gold', 'Guests': 'guests' };
    setForm({
      title: template.title,
      message: template.message,
      audience: audienceMap[template.audience] || 'all',
      channel: template.channel.toLowerCase(),
    });
    if (!showCreate) setShowCreate(true);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Promotions" />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – connect to Supabase to send promotions</p>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="glass-card p-4 border border-[hsl(var(--gold))]/20">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-5 h-5 text-[hsl(var(--gold))]" />
            <span className="font-semibold">Push Notifications</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Promotions are saved to the database. SMS/Email delivery requires Twilio/SendGrid edge functions. FCM push requires Firebase setup.
          </p>
        </div>
      </div>

      {/* Templates Dropdown */}
      {templates.length > 0 && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Templates</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className="flex-shrink-0 glass-card p-3 text-left max-w-[180px] hover:bg-accent/30 transition-all group relative"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                  <span className="text-xs font-semibold truncate">{t.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{t.message}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                  className="absolute top-1 right-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showCreate && (
        <div className="px-4 mb-6">
          <button
            onClick={() => isOnline ? setShowCreate(true) : toast.error('Offline – changes will not save')}
            disabled={!isOnline}
            className="w-full py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" /> Create Promotion
          </button>
        </div>
      )}

      {showCreate && (
        <div className="px-4 mb-6">
          <div className="glass-card p-4 space-y-4 border border-[hsl(var(--gold))]/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[hsl(var(--gold))]">New Promotion</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-accent/30"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Weekend Special" className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Message</label>
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Write your promotion message..." rows={3} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Audience</label>
                <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none text-sm appearance-none">
                  <option value="all">All Members</option>
                  <option value="gold">Gold Members</option>
                  <option value="guests">Guests Only</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
                <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none text-sm appearance-none">
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <Send className="w-4 h-4" />
                {isPending ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate || !form.title || !form.message}
                className="px-4 py-3 rounded-xl bg-secondary border border-border/50 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-accent/30 transition-all"
              >
                <Save className="w-4 h-4" />
                <span className="text-sm">Save Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Promotions */}
      <div className="px-4">
        <h3 className="font-semibold mb-3">Past Promotions</h3>
        {isLoading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading promotions…</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No promotions sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map(promo => (
              <div key={promo.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{promo.title}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{promo.channel}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{promo.message}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {promo.audience}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(promo.sentAt, 'MMM d, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionsScreen;
