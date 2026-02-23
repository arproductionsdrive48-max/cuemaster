import { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import loginBg from '@/assets/login-bg.jpg';
import { supabase, isSupabaseConnected } from '@/lib/supabase';
import { toast } from 'sonner';
import { warmUpSchemaCache } from '@/lib/schemaCache';


interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Warm up schema cache as soon as login screen mounts
  useEffect(() => {
    warmUpSchemaCache();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // If Supabase is connected, use real auth
    if (isSupabaseConnected() && supabase) {
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError('Invalid email or password. Please try again.');
          return;
        }
        if (data?.user) {
          onLogin();
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Demo mode: validate non-empty fields only (no real server)
      if (!email.trim() || !password) {
        setError('Please enter your email and password.');
        setIsLoading(false);
        return;
      }
      setTimeout(() => {
        setIsLoading(false);
        onLogin();
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={loginBg} 
          alt="Snooker table background" 
          className="w-full h-full object-cover"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo Section */}
        <div className="text-center mb-10 animate-fade-in-up">
          {/* Logo Icon */}
          <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-transparent flex items-center justify-center relative overflow-hidden">
            <img 
              src="/logo.png?v=2" 
              alt="Snook OS Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          {/* App Name */}
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-foreground">Snook</span>
            <span className="text-[hsl(var(--gold))]"> OS</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-foreground/60 mt-2 text-xs uppercase tracking-[0.2em] font-medium">
            Staff Access Portal
          </p>
        </div>

        {/* Login Form Card */}
        <form 
          onSubmit={handleSubmit} 
          className="w-full max-w-sm animate-fade-in-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="rounded-3xl p-6 space-y-5" style={{
            background: 'rgba(25, 25, 25, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-foreground/70 font-medium pl-1">
                Email Address
              </label>
              <div className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200",
                "bg-white/5 border",
                focusedField === 'email' 
                  ? "border-[hsl(var(--gold))]/50 shadow-[0_0_0_3px_hsl(var(--gold)/0.1)]" 
                  : "border-white/10"
              )}>
                <Mail className={cn(
                  "w-5 h-5 transition-colors",
                  focusedField === 'email' ? "text-[hsl(var(--gold))]" : "text-foreground/40"
                )} />
                <input
                  type="email"
                  placeholder="staff@snookos.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="flex-1 bg-transparent outline-none placeholder:text-foreground/30 text-foreground"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-foreground/70 font-medium pl-1">
                Password
              </label>
              <div className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200",
                "bg-white/5 border",
                focusedField === 'password' 
                  ? "border-[hsl(var(--gold))]/50 shadow-[0_0_0_3px_hsl(var(--gold)/0.1)]" 
                  : "border-white/10"
              )}>
                <Lock className={cn(
                  "w-5 h-5 transition-colors",
                  focusedField === 'password' ? "text-[hsl(var(--gold))]" : "text-foreground/40"
                )} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="flex-1 bg-transparent outline-none placeholder:text-foreground/30 text-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-foreground/40 hover:text-foreground/70 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button 
                type="button"
                className="text-sm text-foreground/60 hover:text-[hsl(var(--gold))] transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200",
                "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]",
                "shadow-[0_8px_32px_hsl(var(--gold)/0.4)]",
                "hover:shadow-[0_12px_40px_hsl(var(--gold)/0.5)] hover:scale-[1.02]",
                "active:scale-[0.98]",
                isLoading && "opacity-80"
              )}
            >
              {isLoading ? (
                <div className="w-6 h-6 mx-auto border-2 border-[hsl(var(--gold-foreground))]/30 border-t-[hsl(var(--gold-foreground))] rounded-full animate-spin" />
              ) : (
                'Log In'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div 
        className="relative z-10 pb-8 pt-4 text-center animate-fade-in-up"
        style={{ animationDelay: '0.2s' }}
      >
        {/* Contact Admin */}
        <div className="flex items-center justify-center gap-2 text-foreground/40 text-sm mb-6">
          <Headphones className="w-4 h-4" />
          <span>Contact System Administrator</span>
        </div>
        
        {/* iOS Home Indicator */}
        <div className="flex justify-center">
          <div className="w-32 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
