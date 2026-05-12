"use client";
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { syncCloudToLocal, syncLocalToCloud } from '@/lib/sync-manager';
import { setActiveUserId, setStorage } from '@/lib/storage';
import { createClient } from '@/utils/supabase/client';
import { getURL } from '@/lib/get-url';
import { useLanguage } from '@/lib/i18n';

import { Suspense } from 'react';

type AuthView = 'signin' | 'signup' | 'forgot' | 'check_email' | 'reset_sent' | 'set_password' | 'set_username';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const validateUsername = (value: string, t: (key: string) => string): string | null => {
  const username = normalizeUsername(value);

  if (username.length < 3 || username.length > 20) {
    return t("username_rule_length");
  }

  if (!/^[a-z]/.test(username)) {
    return t("username_rule_start");
  }

  if (!/^[a-z0-9._]+$/.test(username)) {
    return t("username_rule_charset");
  }

  if (username.includes('..') || username.includes('__')) {
    return t("username_rule_repeat");
  }

  if (/[._]$/.test(username)) {
    return t("username_rule_end");
  }

  return null;
};

function AuthWidgetContent({ onAuthChange }: { onAuthChange: () => void }) {
  const [user, setUser] = useState<{ id: string; email: string; username?: string | null } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthView>('signin');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const authRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();

  const supabase = createClient();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          setError(error.message || t("email_link_invalid"));
          setIsRecoveryMode(false);
          setIsOpen(true);
          setView('signin');
          return;
        }

        resetForm();
        setError(null);
        setIsRecoveryMode(true);
        setIsOpen(true);
        setView('set_password');
        window.history.replaceState(null, "", window.location.pathname);
      });
      return;
    }

    if (searchParams?.get("update_password") === "true") {
      setIsRecoveryMode(true);
      setIsOpen(true);
      setView("set_password");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        let checkUsername = u.user_metadata?.username;
        
        // Fallback: If metadata is missing username, check the database profile
        if (!checkUsername) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('id', u.id)
            .single();
          
          if (profile?.username) {
            checkUsername = profile.username;
            // Silently update metadata so it's cached on the user object for next time
            await supabase.auth.updateUser({ data: { username: checkUsername } });
          }
        }

        setUser({ id: u.id, email: u.email || '', username: checkUsername });
        setActiveUserId(u.id);
        if (checkUsername) setStorage('active_username', checkUsername);
        setSyncing(true);
        syncCloudToLocal().finally(() => {
          setSyncing(false);
          onAuthChange();
        });
        
        if (!checkUsername) {
          setIsOpen(true);
          setView('set_username');
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setActiveUserId(null);
        localStorage.removeItem('active_username');
        setUser(null);
        onAuthChange();
      }
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link and has a valid recovery session.
        // Show the set-new-password form immediately — do NOT redirect to sign-in.
        resetForm();
        setIsRecoveryMode(true);
        setView('set_password');
        setIsOpen(true);
      }
    });

    // Surface confirmation errors from email callback redirects
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      setIsOpen(true);
      if (authError === 'confirmation_failed') {
        setError(t("email_link_invalid"));
      } else if (authError.includes('identity_already_exists') || authError.toLowerCase().includes('already registered')) {
        setError(t("google_link_conflict"));
      } else {
        setError(decodeURIComponent(authError));
      }
      window.history.replaceState({}, '', '/');
    }

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isRecoveryMode && view === 'set_password') return;
      if (user && !user.username && view === 'set_username') return; // Keep open for prompt
      if (authRef.current && !authRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isRecoveryMode, view]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setError(null);
    setInfo(null);
    setUsernameStatus('idle');
  };

  const switchView = (v: AuthView) => {
    resetForm();
    setView(v);
  };

  const checkUsernameAvailability = async (rawValue: string) => {
    const candidate = normalizeUsername(rawValue);
    const validationError = validateUsername(candidate, t);
    if (!candidate) {
      setUsernameStatus('idle');
      setError(null);
      return false;
    }
    if (validationError) {
      setUsernameStatus('idle');
      setError(validationError);
      return false;
    }

    setUsernameStatus('checking');
    setError(null);
    setInfo(null);
    const { data, error: rpcError } = await supabase.rpc('is_username_available', {
      candidate_username: candidate,
    });

    if (rpcError) {
      setUsernameStatus('idle');
      return true;
    }

    if (data === false) {
      setUsernameStatus('taken');
      setError(t("username_taken"));
      return false;
    }

    setUsernameStatus('available');
    setError(null);
    return true;
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getURL()}/auth/callback`,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      if (err.message.includes('Email not confirmed')) {
        setError(t("confirm_email_first"));
      } else if (err.message.includes('Invalid login credentials')) {
        setError(t("incorrect_email_password"));
      } else {
        setError(err.message);
      }
      return;
    }
    if (!data.user) { setError(t("sign_in_failed_retry")); return; }
    
    const signedInUsername = data.user.user_metadata?.username;
    setActiveUserId(data.user.id);
    if (signedInUsername) setStorage('active_username', signedInUsername);
    setUser({ id: data.user.id, email: data.user.email || '', username: signedInUsername });
    
    if (!signedInUsername) {
      setView('set_username');
      setIsOpen(true);
    } else {
      setIsOpen(false);
      resetForm();
    }
    
    setSyncing(true);
    await syncCloudToLocal();
    setSyncing(false);
    onAuthChange();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const cleanUsername = normalizeUsername(username);
    const usernameError = validateUsername(cleanUsername, t);
    if (usernameError) {
      setError(usernameError);
      setLoading(false);
      return;
    }
    if (usernameStatus === 'taken') {
      setError(t("username_taken"));
      setLoading(false);
      return;
    }
    const available = await checkUsernameAvailability(cleanUsername);
    if (!available) {
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: cleanUsername },
        emailRedirectTo: `${getURL()}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      if (err.message.includes('already registered') || err.message.includes('User already registered')) {
        setError(t("email_exists_try_signin"));
      } else if (err.message.includes('Password should be')) {
        setError(t("password_min_6"));
      } else if (err.message.includes('duplicate key') || err.message.includes('Database error saving new user')) {
        setUsernameStatus('taken');
        setError(t("username_taken"));
      } else {
        setError(err.message);
      }
      return;
    }
    if (data.session) {
      // Email confirmation disabled in Supabase — user is immediately signed in
      setActiveUserId(data.user!.id);
      setStorage('active_username', cleanUsername);
      setUser({ id: data.user!.id, email: data.user!.email || '', username: cleanUsername });
      setIsOpen(false);
      resetForm();
      setSyncing(true);
      await syncCloudToLocal();
      setSyncing(false);
      onAuthChange();
    } else {
      // Email confirmation enabled — show check-your-inbox state
      setView('check_email');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getURL()}/?update_password=true`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setView('reset_sent');
  };

  const handleResendConfirmation = async () => {
    if (!email) { setError(t("email_address")); return; }
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo(t("confirmation_resent"));
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setActiveUserId(null);
    localStorage.removeItem('active_username');
    setUser(null);
    setLoading(false);
    onAuthChange();
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError(t("password_min_6")); return; }
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message || t("failed_update_password"));
      return;
    }
    // Password updated — sign out so the user proves it with a fresh sign-in
    await supabase.auth.signOut();
    setActiveUserId(null);
    setUser(null);
    setIsRecoveryMode(false);
    resetForm();
    setView('signin');
    setIsOpen(false);
    setInfo(t("password_updated_signin"));
    onAuthChange();
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = normalizeUsername(username);
    const usernameError = validateUsername(cleanUsername, t);
    if (usernameError) { setError(usernameError); return; }
    const available = await checkUsernameAvailability(cleanUsername);
    if (!available) return;
    setLoading(true); setError(null);
    // This updates raw_user_meta_data and securely triggers our db migration on_auth_user_updated
    const { error: err } = await supabase.auth.updateUser({ data: { username: cleanUsername } });
    setLoading(false);
    if (err) {
      // Very likely a uniqueness constraint collision from user_profiles trigger if taken
      if (err.message.includes('duplicate key') || err.message.includes('Database error saving new user')) {
        setUsernameStatus('taken');
        setError(t("username_taken"));
      } else {
        setError(t("failed_save_username"));
      }
      return;
    }
    setStorage('active_username', cleanUsername);
    setUser(prev => prev ? { ...prev, username: cleanUsername } : null);
    setInfo(t("username_saved"));
    setTimeout(() => {
      setIsOpen(false);
      resetForm();
    }, 1500);
  };

  const forceSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await syncLocalToCloud().catch(err => { console.error('Sync failed:', err.message); });
    setSyncing(false);
  };

  const isRecoveryPasswordFlow = isRecoveryMode && view === 'set_password';
  const forcesSetUsernameFlow = user && !user.username;

  // ─── Signed-in state ────────────────────────────────────────────────────────
  if (user && !isRecoveryPasswordFlow && !forcesSetUsernameFlow) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-3 ml-1 sm:ml-4 mr-0 sm:mr-2 min-w-0">
        <div className="flex flex-col items-end min-w-0">
          <span className="max-w-[4.75rem] sm:max-w-none truncate text-[9px] sm:text-[10px] font-bold text-neutral-400 capitalize tracking-[0.08em] sm:tracking-widest leading-tight">
            {user.username || user.email.split('@')[0]}
          </span>
          <button onClick={forceSync} className="text-[9px] sm:text-[10px] font-medium text-[#D6C19E] hover:text-[#c2ad8a] flex items-center justify-end gap-1 transition-colors">
            <span className="hidden sm:inline">{syncing ? t("syncing") : t("synced")}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} />
          </button>
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 hover:text-red-500 rounded-full text-neutral-400 transition-all shadow-sm shrink-0"
          title={t("sign_out")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>
    );
  }

  // ─── Signed-out / auth panel ─────────────────────────────────────────────────
  return (
    <>
      <button
        onClick={() => { 
          setIsOpen(!isOpen); 
          if (!isOpen) { 
            if (isRecoveryMode) {
              setView('set_password');
            } else {
              resetForm(); 
              setView('signin'); 
            }
          } 
        }}
        className="px-2 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#D6C19E] dark:hover:border-[#D6C19E] hover:bg-white dark:hover:bg-neutral-900 transition-all rounded-full ml-1 sm:ml-4 mr-0 sm:mr-2 shadow-sm whitespace-nowrap shrink-0"
      >
        {forcesSetUsernameFlow ? t("set_username") : (isRecoveryPasswordFlow ? t("set_password") : t("sign_in"))}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-sm bg-neutral-900/40 transition-all duration-200">
          
          <div ref={authRef} className="relative w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-8 transform transition-all">
            
            {/* Close Button */}
            {(!isRecoveryPasswordFlow && !forcesSetUsernameFlow) && (
              <button 
                onClick={() => setIsOpen(false)} 
                className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800`}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}

            {/* ── Check your email ── */}
            {view === 'check_email' && (
              <div className="flex flex-col gap-3 text-center pt-2">
                <p className="text-3xl">📬</p>
                <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">{t("check_your_email")}</p>
                <p className="text-sm text-neutral-500">{t("signup_confirmation_sent")} <strong>{email}</strong>. {t("click_to_complete_signup")}</p>
                <button onClick={handleResendConfirmation} disabled={loading} className="text-sm text-[#D6C19E] hover:text-[#c2ad8a] mt-2 font-medium transition-colors">
                  {loading ? t("resending") : t("resend_confirmation_email")}
                </button>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                {info && <p className="text-xs text-green-600 mt-1">{info}</p>}
                <button onClick={() => switchView('signin')} className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-4">{t("back_to_sign_in")}</button>
              </div>
            )}

            {/* ── Set Username for existing users ── */}
            {view === 'set_username' && (
              <>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-1">{t("set_your_username")}</h3>
                <p className="text-sm text-neutral-500 mb-4">{t("set_username_desc")}</p>
                <form onSubmit={handleSetUsername} className="flex flex-col gap-3">
                  <input
                    required
                    type="text"
                    placeholder={t("username_placeholder")}
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value);
                      setUsernameStatus('idle');
                      setError(null);
                      setInfo(null);
                    }}
                    onBlur={e => void checkUsernameAvailability(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  {usernameStatus === 'checking' && <p className="text-xs text-neutral-400 px-1">{t("checking_username")}</p>}
                  {usernameStatus === 'available' && !error && <p className="text-xs text-green-600 px-1">{t("username_available")}</p>}
                  {error && <p className="text-xs text-red-500 px-1">{error}</p>}
                  {info && <p className="text-xs text-green-600 px-1">{info}</p>}
                  <button disabled={loading} type="submit" className="w-full py-2.5 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-xl text-sm font-bold mt-2 transition-colors shadow-sm disabled:opacity-50">
                    {loading ? t("saving") : t("save_username")}
                  </button>
                </form>
              </>
            )}

            {/* ── Set new password (PASSWORD_RECOVERY flow) ── */}
            {view === 'set_password' && (
              <>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-1">{t("set_new_password")}</h3>
                <p className="text-sm text-neutral-500 mb-4">{t("set_new_password_desc")}</p>
                <form onSubmit={handleSetPassword} className="flex flex-col gap-3">
                  <input
                    required
                    type="password"
                    placeholder={t("new_password_min_6")}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  {error && <p className="text-xs text-red-500 px-1">{error}</p>}
                  <button disabled={loading} type="submit" className="w-full py-2.5 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-xl text-sm font-bold mt-2 transition-colors shadow-sm disabled:opacity-50">
                    {loading ? t("updating") : t("set_new_password")}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsRecoveryMode(false); setIsOpen(false); setView('signin'); }} 
                    className="w-full text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-3"
                  >
                    {t("cancel")}
                  </button>
                </form>
              </>
            )}

            {/* ── Reset email sent ── */}
            {view === 'reset_sent' && (
              <div className="flex flex-col gap-3 text-center pt-2">
                <p className="text-3xl">✉️</p>
                <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">{t("reset_link_sent")}</p>
                <p className="text-sm text-neutral-500">{t("check_inbox_reset")} <strong>{email}</strong> {t("for_reset_link")}</p>
                <button onClick={() => switchView('signin')} className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-4 font-medium">{t("back_to_sign_in")}</button>
              </div>
            )}

            {/* ── Forgot password ── */}
            {view === 'forgot' && (
              <>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-4">{t("reset_password")}</h3>
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
                  <input 
                    required 
                    type="email" 
                    placeholder={t("email_address")} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  {error && <p className="text-xs text-red-500 px-1">{error}</p>}
                  <button disabled={loading} type="submit" className="w-full py-2.5 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-xl text-sm font-bold mt-2 transition-colors shadow-sm disabled:opacity-50">
                    {loading ? t("sending") : t("send_reset_link")}
                  </button>
                </form>
                <button onClick={() => switchView('signin')} className="w-full text-sm text-neutral-400 mt-4 hover:text-neutral-600 dark:hover:text-neutral-300 text-center font-medium">{t("back_to_sign_in")}</button>
              </>
            )}

            {/* ── Sign in ── */}
            {view === 'signin' && (
              <>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-5 text-center">{t("sign_in_to_sync")}</h3>
                
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 py-2.5 rounded-xl font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all shadow-sm mb-5 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t("continue_with_google")}
                </button>

                <div className="relative mb-5 flex items-center">
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                  <span className="flex-shrink mx-3 text-xs text-neutral-400 font-medium">{t("or")}</span>
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                </div>

                <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                  <input 
                    required 
                    type="email" 
                    placeholder={t("email")} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  <input 
                    required 
                    type="password" 
                    placeholder={t("password_min_6")} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  {error && (
                    <div className="text-xs text-red-500 px-1">
                      <p>{error}</p>
                      {error.includes('confirm') && (
                        <button type="button" onClick={handleResendConfirmation} disabled={loading} className="text-[#D6C19E] hover:text-[#c2ad8a] underline mt-1 block font-medium">
                          {t("resend_confirmation_email")}
                        </button>
                      )}
                    </div>
                  )}
                  {info && <p className="text-xs text-green-600 px-1">{info}</p>}
                  <button disabled={loading} type="submit" className="w-full py-2.5 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-xl text-sm font-bold mt-1 transition-colors shadow-sm disabled:opacity-50">
                    {loading ? t("loading") : t("sign_in")}
                  </button>
                </form>
                
                <div className="flex flex-col gap-2 mt-4 text-center">
                  <button onClick={() => switchView('forgot')} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-medium transition-colors">
                    {t("forgot_password_q")}
                  </button>
                  <button onClick={() => switchView('signup')} className="text-xs text-[#B18E4E] dark:text-[#D6C19E] hover:underline font-semibold mt-1">
                    {t("need_account_signup")}
                  </button>
                </div>
              </>
            )}

            {/* ── Sign up ── */}
            {view === 'signup' && (
              <>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-5 text-center">{t("create_account")}</h3>
                
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 py-2.5 rounded-xl font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all shadow-sm mb-5 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t("continue_with_google")}
                </button>

                <div className="relative mb-5 flex items-center">
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                  <span className="flex-shrink mx-3 text-xs text-neutral-400 font-medium">{t("or")}</span>
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                </div>

                <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                  <input 
                    required 
                    type="email" 
                    placeholder={t("email")} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  <input 
                    required 
                    type="password" 
                    placeholder={t("password_min_6")} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  <input
                    required
                    type="text"
                    placeholder={t("unique_username_placeholder")}
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value);
                      setUsernameStatus('idle');
                      setError(null);
                      setInfo(null);
                    }}
                    onBlur={e => void checkUsernameAvailability(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-[#D6C19E] outline-none transition-all"
                  />
                  {usernameStatus === 'checking' && <p className="text-xs text-neutral-400 px-1">{t("checking_username")}</p>}
                  {usernameStatus === 'available' && !error && <p className="text-xs text-green-600 px-1">{t("username_available")}</p>}
                  {error && <p className="text-xs text-red-500 px-1">{error}</p>}
                  {info && <p className="text-xs text-green-600 px-1">{info}</p>}
                  <button disabled={loading} type="submit" className="w-full py-2.5 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-xl text-sm font-bold mt-2 transition-colors shadow-sm disabled:opacity-50">
                    {loading ? t("loading") : t("sign_up")}
                  </button>
                </form>
                <button onClick={() => switchView('signin')} className="w-full text-sm text-neutral-400 mt-5 hover:text-neutral-600 dark:hover:text-neutral-300 text-center font-medium">{t("have_account_signin")}</button>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}

export function AuthWidget(props: { onAuthChange?: () => void }) {
  return (
    <Suspense fallback={<div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse shrink-0 ml-1 sm:ml-4 mr-0 sm:mr-2" />}>
      <AuthWidgetContent onAuthChange={props.onAuthChange || (() => {})} />
    </Suspense>
  );
}
