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

function validateUsernameValue(value: string, t: (key: string) => string) {
  const normalized = normalizeUsername(value);
  if (normalized.length < 3 || normalized.length > 20) return t("username_rule_length");
  if (!/^[a-z]/.test(normalized)) return t("username_rule_start");
  if (!/^[a-z][a-z0-9._]*$/.test(normalized)) return t("username_rule_charset");
  if (normalized.includes('..') || normalized.includes('__')) return t("username_rule_repeat");
  if (/[._]$/.test(normalized)) return t("username_rule_end");
  return null;
}

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
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        const checkUsername = u.user_metadata?.username;
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
    if (params.get('auth_error') === 'confirmation_failed') {
      setIsOpen(true);
      setError(t("email_link_invalid"));
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
    const usernameValidationError = validateUsernameValue(cleanUsername, t);
    if (usernameValidationError) {
      setError(usernameValidationError);
      setLoading(false);
      return;
    }
    if (usernameStatus === 'taken') {
      setError(t("username_taken"));
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
      } else if (err.message.includes('duplicate key')) {
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
    const usernameValidationError = validateUsernameValue(cleanUsername, t);
    if (usernameValidationError) { setError(usernameValidationError); return; }
    if (usernameStatus === 'taken') { setError(t("username_taken")); return; }
    setLoading(true); setError(null);
    // This updates raw_user_meta_data and securely triggers our db migration on_auth_user_updated
    const { error: err } = await supabase.auth.updateUser({ data: { username: cleanUsername } });
    setLoading(false);
    if (err) {
      // Very likely a uniqueness constraint collision from user_profiles trigger if taken
      if (err.message.includes('duplicate key')) {
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

  const checkUsernameAvailability = async (rawValue: string) => {
    const candidate = normalizeUsername(rawValue);
    const validationError = validateUsernameValue(candidate, t);
    if (!candidate) {
      setUsernameStatus('idle');
      setError(null);
      return;
    }
    if (validationError) {
      setUsernameStatus('idle');
      setError(validationError);
      return;
    }

    setUsernameStatus('checking');
    setError(null);
    setInfo(null);

    const { data, error: rpcError } = await supabase.rpc('is_username_available', {
      candidate_username: candidate,
    });

    if (rpcError) {
      setUsernameStatus('idle');
      return;
    }

    if (data) {
      setUsernameStatus('available');
      setError(null);
    } else {
      setUsernameStatus('taken');
      setError(t("username_taken"));
    }
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
    <div className="relative">
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
        className="px-2 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#D6C19E] dark:hover:border-[#D6C19E] hover:bg-white dark:hover:bg-neutral-900 transition-all rounded-full ml-1 sm:ml-4 mr-0 sm:mr-2 shadow-sm whitespace-nowrap"
      >
        {forcesSetUsernameFlow ? t("set_username") : (isRecoveryPasswordFlow ? t("set_password") : t("sign_in"))}
      </button>

      {isOpen && (
        <div ref={authRef} className={`absolute top-full mt-2 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4 z-50 ${language === 'ar' ? 'left-0' : 'right-0'}`}>

          {/* ── Check your email ── */}
          {view === 'check_email' && (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-2xl">📬</p>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{t("check_your_email")}</p>
              <p className="text-xs text-neutral-500">{t("signup_confirmation_sent")} <strong>{email}</strong>. {t("click_to_complete_signup")}</p>
              <button onClick={handleResendConfirmation} disabled={loading} className="text-xs text-[#D6C19E] hover:text-[#c2ad8a] mt-1 transition-colors">
                {loading ? t("resending") : t("resend_confirmation_email")}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {info && <p className="text-xs text-green-600">{info}</p>}
              <button onClick={() => switchView('signin')} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-1">{t("back_to_sign_in")}</button>
            </div>
          )}

          {/* ── Set Username for existing users ── */}
          {view === 'set_username' && (
            <>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">{t("set_your_username")}</h3>
              <p className="text-xs text-neutral-500 mb-3">{t("set_username_desc")}</p>
              <form onSubmit={handleSetUsername} className="flex flex-col gap-2">
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
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200"
                />
                {usernameStatus === 'checking' && <p className="text-xs text-neutral-400">{t("checking_username")}</p>}
                {usernameStatus === 'available' && !error && <p className="text-xs text-green-600">{t("username_available")}</p>}
                {error && <p className="text-xs text-red-500">{error}</p>}
                {info && <p className="text-xs text-green-600">{info}</p>}
                <button disabled={loading} type="submit" className="w-full py-2 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-lg text-sm font-bold mt-1 transition-colors">
                  {loading ? t("saving") : t("save_username")}
                </button>
              </form>
            </>
          )}

          {/* ── Set new password (PASSWORD_RECOVERY flow) ── */}
          {view === 'set_password' && (
            <>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">{t("set_new_password")}</h3>
              <p className="text-xs text-neutral-500 mb-3">{t("set_new_password_desc")}</p>
              <form onSubmit={handleSetPassword} className="flex flex-col gap-2">
                <input
                  required
                  type="password"
                  placeholder={t("new_password_min_6")}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button disabled={loading} type="submit" className="w-full py-2 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-lg text-sm font-bold mt-1 transition-colors">
                  {loading ? t("updating") : t("set_new_password")}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsRecoveryMode(false); setIsOpen(false); setView('signin'); }} 
                  className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-2"
                >
                  {t("cancel")}
                </button>
              </form>
            </>
          )}

          {/* ── Reset email sent ── */}
          {view === 'reset_sent' && (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-2xl">✉️</p>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{t("reset_link_sent")}</p>
              <p className="text-xs text-neutral-500">{t("check_inbox_reset")} <strong>{email}</strong> {t("for_reset_link")}</p>
              <button onClick={() => switchView('signin')} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-2">{t("back_to_sign_in")}</button>
            </div>
          )}

          {/* ── Forgot password ── */}
          {view === 'forgot' && (
            <>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3">{t("reset_password")}</h3>
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-2">
                <input required type="email" placeholder={t("email_address")} value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button disabled={loading} type="submit" className="w-full py-2 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-lg text-sm font-bold mt-1 transition-colors">
                  {loading ? t("sending") : t("send_reset_link")}
                </button>
              </form>
              <button onClick={() => switchView('signin')} className="w-full text-xs text-neutral-400 mt-3 hover:text-neutral-600 dark:hover:text-neutral-300">{t("back_to_sign_in")}</button>
            </>
          )}

          {/* ── Sign in ── */}
          {view === 'signin' && (
            <>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3">{t("sign_in_to_sync")}</h3>
              <form onSubmit={handleSignIn} className="flex flex-col gap-2">
                <input required type="email" placeholder={t("email")} value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                <input required type="password" placeholder={t("password_min_6")} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                {error && (
                  <div className="text-xs text-red-500">
                    <p>{error}</p>
                    {error.includes('confirm') && (
                    <button type="button" onClick={handleResendConfirmation} disabled={loading} className="text-[#D6C19E] hover:text-[#c2ad8a] underline mt-1 block">
                        {t("resend_confirmation_email")}
                      </button>
                    )}
                  </div>
                )}
                {info && <p className="text-xs text-green-600">{info}</p>}
                <button disabled={loading} type="submit" className="w-full py-2 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-lg text-sm font-bold mt-1 transition-colors">
                  {loading ? t("loading") : t("sign_in")}
                </button>
              </form>
              <button onClick={() => switchView('forgot')} className="w-full text-xs text-neutral-400 mt-2 hover:text-neutral-600 dark:hover:text-neutral-300">
                {t("forgot_password_q")}
              </button>
              <button onClick={() => switchView('signup')} className="w-full text-xs text-neutral-400 mt-1 hover:text-neutral-600 dark:hover:text-neutral-300">
                {t("need_account_signup")}
              </button>
            </>
          )}

          {/* ── Sign up ── */}
          {view === 'signup' && (
            <>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3">{t("create_account")}</h3>
              <form onSubmit={handleSignUp} className="flex flex-col gap-2">
                <input required type="email" placeholder={t("email")} value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                <input required type="password" placeholder={t("password_min_6")} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                <input
                  required
                  type="text"
                  placeholder={t("unique_username_placeholder")}
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setUsernameStatus('idle');
                    setError(null);
                  }}
                  onBlur={e => void checkUsernameAvailability(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200"
                />
                {usernameStatus === 'checking' && <p className="text-xs text-neutral-400">{t("checking_username")}</p>}
                {usernameStatus === 'available' && !error && <p className="text-xs text-green-600">{t("username_available")}</p>}
                {error && <p className="text-xs text-red-500">{error}</p>}
                {info && <p className="text-xs text-green-600">{info}</p>}
                <button disabled={loading} type="submit" className="w-full py-2 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-lg text-sm font-bold mt-1 transition-colors">
                  {loading ? t("loading") : t("sign_up")}
                </button>
              </form>
              <button onClick={() => switchView('signin')} className="w-full text-xs text-neutral-400 mt-3 hover:text-neutral-600 dark:hover:text-neutral-300">
                {t("have_account_signin")}
              </button>
            </>
          )}

        </div>
      )}
    </div>
  );
}

export function AuthWidget(props: { onAuthChange?: () => void }) {
  return (
    <Suspense fallback={<div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse shrink-0 ml-1 sm:ml-4 mr-0 sm:mr-2" />}>
      <AuthWidgetContent onAuthChange={props.onAuthChange || (() => {})} />
    </Suspense>
  );
}
