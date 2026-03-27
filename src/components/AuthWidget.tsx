import { useState, useEffect } from 'react';
import { syncCloudToLocal, syncLocalToCloud } from '@/lib/sync-manager';
import { setActiveUserId } from '@/lib/storage';
import { createClient } from '@/utils/supabase/client';

export function AuthWidget({ onAuthChange }: { onAuthChange: () => void }) {
  const [user, setUser] = useState<{ id: string, email: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ? { id: u.id, email: u.email || '' } : null);
      if (u) {
        setActiveUserId(u.id);
        setSyncing(true);
        syncCloudToLocal().finally(() => {
          setSyncing(false);
          onAuthChange();
        });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setActiveUserId(null);
        setUser(null);
        onAuthChange();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let res;
      if (isLogin) {
        res = await supabase.auth.signInWithPassword({ email, password });
      } else {
        res = await supabase.auth.signUp({ email, password });
      }
      
      if (res.error) throw res.error;
      if (!res.data.user) throw new Error("Authentication failed. Please try again.");
      
      setActiveUserId(res.data.user.id);
      setUser({ id: res.data.user.id, email: res.data.user.email || '' });
      setIsOpen(false);
      
      setSyncing(true);
      await syncCloudToLocal();
      setSyncing(false);
      onAuthChange();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setActiveUserId(null);
    setUser(null);
    setLoading(false);
    onAuthChange();
  };

  const forceSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await syncLocalToCloud().catch(err => {
      console.error('Sync failed:', err.message);
    });
    setSyncing(false);
  };

  if (!user) {
    return (
      <div className="relative">
        <button onClick={() => setIsOpen(!isOpen)} className="text-xs font-bold text-neutral-500 hover:text-[#D6C19E] transition-colors ml-4 mr-2">
          Sign In
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full mt-2 w-64 right-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4 z-50">
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3">{isLogin ? 'Sign In to Sync' : 'Create Account'}</h3>
              <form onSubmit={handleAuth} className="flex flex-col gap-2">
                <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                <input required type="password" placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-neutral-800 dark:text-neutral-200" />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                <button disabled={loading} type="submit" className="w-full py-2 bg-[#D6C19E] hover:bg-[#c2ad8a] text-white rounded-lg text-sm font-bold mt-2 transition-colors">
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                </button>
              </form>
              <button onClick={() => setIsLogin(!isLogin)} className="w-full text-xs text-neutral-400 mt-3 hover:text-neutral-600 dark:hover:text-neutral-300">
                {isLogin ? "Need an account? Sign up" : "Have an account? Sign in"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 ml-4 mr-2">
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-tight">{user.email.split('@')[0]}</span>
        <button onClick={forceSync} className="text-[10px] font-medium text-[#D6C19E] hover:text-[#c2ad8a] flex items-center gap-1 transition-colors">
          {syncing ? 'Syncing...' : 'Synced'}
          <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} />
        </button>
      </div>
      <button onClick={handleLogout} className="w-7 h-7 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 hover:text-red-500 rounded-full text-neutral-400 transition-all shadow-sm shrink-0" title="Sign Out">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  );
}
