import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from './App';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import './auth.css';

type AuthMode = 'sign-in' | 'sign-up';

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountChipVisible, setAccountChipVisible] = useState(true);

  useEffect(() => {
    const openAuth = () => setAuthOpen(true);
    window.addEventListener('boards:open-auth', openAuth);
    return () => window.removeEventListener('boards:open-auth', openAuth);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true);
      return;
    }

    let alive = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        setMessage(error.message);
        setIsError(true);
      }
      setSession(data.session);
      setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const showMessage = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    showMessage('');

    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          showMessage('Account created. You are signed in.');
        } else {
          showMessage('Check your inbox to confirm your email, then return here to sign in.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        showMessage('Signed in successfully.');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.', true);
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    showMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      showMessage(error.message, true);
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!supabase || busy) return;
    if (!email.trim()) {
      showMessage('Enter your email address first, then choose “Forgot password?”.', true);
      return;
    }
    setBusy(true);
    showMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    showMessage(error ? error.message : 'If an account exists for that email, a password reset link is on its way.', Boolean(error));
    setBusy(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) showMessage(error.message, true);
  };

  if (!sessionReady) {
    return <div className="auth-loading" role="status">Loading your secure session…</div>;
  }

  if (session && isSupabaseConfigured) {
    return (
      <>
        <App />
        {accountChipVisible ? (
          <button
            type="button"
            className="auth-account-close"
            onClick={() => setAccountChipVisible(false)}
            aria-label="Dismiss account status"
            title="Dismiss account status — manage your account in Settings"
          >
            <span>Signed in</span>
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </>
    );
  }

  return (
    <>
      <App />
      <button type="button" className="auth-login-now" onClick={() => setAuthOpen(true)}>
        Login now <span aria-hidden="true">↗</span>
      </button>
      {authOpen ? (
    <main className="auth-page auth-page--modal">
      <div className="auth-glow auth-glow--one" aria-hidden="true" />
      <div className="auth-glow auth-glow--two" aria-hidden="true" />
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="auth-brand" href="/" aria-label="Boards home">
          <span className="auth-brand__mark" aria-hidden="true">B</span>
          <span>boards</span>
        </a>
        <p className="auth-eyebrow">YOUR LINKS, IN THEIR PLACE</p>
        <h1 id="auth-title">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {mode === 'sign-in'
            ? 'Sign in to open your Boards workspace.'
            : 'Create an account to get started with Boards.'}
        </p>

        {!isSupabaseConfigured ? (
          <div className="auth-notice" role="alert">
            <strong>Supabase setup required</strong>
            <span>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to the Vercel project environment variables, then redeploy. See <code>web/.env.example</code>.</span>
          </div>
        ) : null}

        <button className="auth-google" type="button" onClick={() => void signInWithGoogle()} disabled={!isSupabaseConfigured || busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/>
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.36l-3.24-2.54c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.06v2.62A10 10 0 0 0 12 22Z"/>
            <path fill="#FBBC05" d="M6.41 13.96a6 6 0 0 1 0-3.92V7.42H3.06a10 10 0 0 0 0 9.16l3.35-2.62Z"/>
            <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.94 5.42l3.35 2.62C7.2 7.69 9.4 5.94 12 5.94Z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or continue with email</span></div>

        <form className="auth-form" onSubmit={(event) => void handleEmailAuth(event)}>
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!isSupabaseConfigured || busy} />
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!isSupabaseConfigured || busy} />
          {mode === 'sign-in' ? (
            <button type="button" className="auth-forgot" onClick={() => void resetPassword()} disabled={!isSupabaseConfigured || busy}>Forgot password?</button>
          ) : null}
          <button className="auth-submit" type="submit" disabled={!isSupabaseConfigured || busy}>
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in with email' : 'Create account'}
          </button>
        </form>

        {message ? <p className={`auth-message ${isError ? 'auth-message--error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</p> : null}

        <p className="auth-switch">
          {mode === 'sign-in' ? 'New to Boards?' : 'Already have an account?'}{' '}
          <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); showMessage(''); }} disabled={busy}>
            {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        <p className="auth-legal">Secure authentication powered by Supabase. Your password is never stored by Boards.</p>
      </section>
    </main>
      ) : null}
    </>
  );
}
