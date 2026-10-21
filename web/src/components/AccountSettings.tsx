import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Notice = { text: string; error?: boolean } | null;

function providerLabel(user: { app_metadata?: Record<string, unknown> }): string {
  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : 'email';
  return provider === 'google' ? 'Google' : provider === 'email' ? 'Email and password' : provider;
}

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let alive = true;
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        setNotice({ text: error.message, error: true });
        return;
      }
      setUser(data.user);
      setAccountLoaded(true);
      setName(String(data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? ''));
      setAvatarUrl(String(data.user?.user_metadata?.avatar_url ?? ''));
    });
    return () => { alive = false; };
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setNotice(null);
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), avatar_url: avatarUrl.trim() || null },
    });
    setBusy(false);
    if (error) {
      setNotice({ text: error.message, error: true });
      return;
    }
    setUser(data.user);
    setNotice({ text: 'Profile updated successfully.' });
  };

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) {
      setNotice({ text: error.message, error: true });
      return;
    }
    setNewEmail('');
    setNotice({ text: 'Check your inbox to confirm the email address change. Your current email stays active until confirmation.' });
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      setNotice({ text: error.message, error: true });
      return;
    }
    setNewPassword('');
    setNotice({ text: 'Password updated successfully.' });
  };

  const signOut = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) setNotice({ text: error.message, error: true });
  };

  const safeAvatarUrl = (() => {
    try {
      const parsed = new URL(avatarUrl);
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch {
      return '';
    }
  })();

  return (
    <section className="settings-section account-settings" aria-labelledby="settings-account-title">
      <div className="settings-section__heading">
        <h3 id="settings-account-title">Profile & account</h3>
        <p>Manage your public profile and the credentials you use to sign in to Boards.</p>
      </div>

      {!user && accountLoaded ? (
        <div className="account-note">
          Sign in to manage your profile and authentication details.
          <button type="button" className="account-action" onClick={() => window.dispatchEvent(new Event('boards:open-auth'))}>Login now</button>
        </div>
      ) : null}

      {user ? (
        <div className="account-identity">
          {safeAvatarUrl ? (
            <img className="account-avatar" src={safeAvatarUrl} alt="Profile avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="account-avatar account-avatar--placeholder" aria-hidden="true">
              {(name.trim() || user.email || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="account-identity__details">
            <strong>{name.trim() || 'Boards member'}</strong>
            <span>{user.email ?? 'No email address'}</span>
            <span className="account-provider">Signed in with {providerLabel(user)}</span>
          </div>
        </div>
      ) : !accountLoaded ? (
        <div className="account-note">Loading your account details…</div>
      ) : null}

      <form className="account-form" onSubmit={(event) => void saveProfile(event)}>
        <h4>Profile details</h4>
        <label htmlFor="account-name">Display name</label>
        <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Your name" disabled={!user || busy} />
        <label htmlFor="account-avatar-url">Profile photo URL</label>
        <input id="account-avatar-url" type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/photo.jpg" disabled={!user || busy} />
        <button className="account-action" type="submit" disabled={!user || busy}>{busy ? 'Please wait…' : 'Save profile'}</button>
      </form>

      <form className="account-form" onSubmit={(event) => void changeEmail(event)}>
        <h4>Email address</h4>
        <label htmlFor="account-current-email">Current email</label>
        <input id="account-current-email" type="email" value={user?.email ?? ''} readOnly />
        <label htmlFor="account-new-email">New email address</label>
        <input id="account-new-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="new@example.com" required disabled={!user || busy} />
        <button className="account-action account-action--secondary" type="submit" disabled={!user || busy || !newEmail.trim()}>{busy ? 'Please wait…' : 'Update email'}</button>
        <p className="account-help">Supabase may send confirmation links to verify the change before it takes effect.</p>
      </form>

      <form className="account-form" onSubmit={(event) => void changePassword(event)}>
        <h4>Password</h4>
        <label htmlFor="account-new-password">New password</label>
        <input id="account-new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" required disabled={!user || busy} />
        <button className="account-action account-action--secondary" type="submit" disabled={!user || busy || newPassword.length < 8}>{busy ? 'Please wait…' : 'Set new password'}</button>
        <p className="account-help">For Google-only accounts, setting a password lets you also sign in with email and password.</p>
      </form>

      {notice ? <p className={notice.error ? 'account-notice account-notice--error' : 'account-notice'} role={notice.error ? 'alert' : 'status'}>{notice.text}</p> : null}

      <div className="account-signout">
        <div><strong>Sign out</strong><span>End your current Boards session on this device.</span></div>
        <button type="button" className="button button--danger-outline" onClick={() => void signOut()} disabled={!user || busy}>Sign out</button>
      </div>
    </section>
  );
}
