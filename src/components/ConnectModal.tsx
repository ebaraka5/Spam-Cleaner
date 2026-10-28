import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  Key,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Compass,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import type { ProviderType } from '../types/provider.ts';
import { googleSignIn, googleSignInRedirect } from '../services/firebaseAuth.ts';
import firebaseConfig from '../../firebase-applet-config.json';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: ProviderType;
  onConnectGoogle: (token: string, user: { email: string; name?: string }) => void;
  onConnectMicrosoft: (token: string, email: string) => void;
  onConnectYahoo: (creds: { user: string; pass: string; host?: string; port?: number }) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  provider,
  onConnectGoogle,
  onConnectMicrosoft,
  onConnectYahoo,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'microsoft' | 'yahoo'>('google');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Microsoft state
  const [msToken, setMsToken] = useState('');
  const [msEmail, setMsEmail] = useState('');

  // Yahoo state
  const [yahooUser, setYahooUser] = useState('');
  const [yahooPass, setYahooPass] = useState('');
  const [customHost, setCustomHost] = useState('imap.mail.yahoo.com');
  const [customPort, setCustomPort] = useState('993');
  const [showAdvancedImap, setShowAdvancedImap] = useState(false);

  useEffect(() => {
    if (provider === 'microsoft') setActiveTab('microsoft');
    else if (provider === 'yahoo') setActiveTab('yahoo');
    else setActiveTab('google');
  }, [provider]);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const handleCopyHostname = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onConnectGoogle(res.accessToken, {
          email: res.user.email || 'Google User',
          name: res.user.displayName || undefined,
        });
        onClose();
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      console.error('Google Sign-in failed:', errorObj);
      if (errorObj.code === 'auth/unauthorized-domain' || (errorObj.message && errorObj.message.includes('unauthorized-domain'))) {
        setError(`auth/unauthorized-domain: This hosting domain (${currentHostname || 'your Render/Netlify domain'}) has not been authorized in Firebase Authentication.`);
      } else if (errorObj.code === 'auth/popup-closed-by-user' || (errorObj.message && errorObj.message.includes('popup-closed-by-user'))) {
        setError(`auth/popup-closed-by-user: The sign-in popup was automatically closed or blocked by your browser before authentication finished.`);
      } else {
        setError(errorObj.message || 'Failed to authenticate with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectConnect = async () => {
    setRedirecting(true);
    setError(null);
    try {
      await googleSignInRedirect();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to initiate redirect sign-in.');
      setRedirecting(false);
    }
  };

  const handleMicrosoftConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msToken.trim()) {
      setError('Please provide a valid Microsoft Graph Access Token.');
      return;
    }
    onConnectMicrosoft(msToken.trim(), msEmail.trim() || 'Outlook User');
    onClose();
  };

  const handleYahooConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yahooUser.trim() || !yahooPass.trim()) {
      setError('Please provide your email address and App Password.');
      return;
    }
    onConnectYahoo({
      user: yahooUser.trim(),
      pass: yahooPass.trim(),
      host: customHost.trim() || 'imap.mail.yahoo.com',
      port: parseInt(customPort, 10) || 993,
    });
    onClose();
  };

  const isUnauthorizedDomain = error && error.includes('unauthorized-domain');
  const isPopupClosedByUser = error && error.includes('popup-closed-by-user');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Connect Email Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a provider to analyze inboxes in 500-batch increments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Tabs Inside Modal */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'google'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Google Gmail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('microsoft')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'microsoft'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-xs bg-sky-600 text-white font-bold text-[9px] flex items-center justify-center">
              M
            </div>
            <span>Microsoft Outlook</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('yahoo')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'yahoo'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-xs bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">
              Y!
            </div>
            <span>Yahoo (IMAP)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 space-y-3">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words font-medium">{error}</span>
              </div>

              {/* Special Guided Resolution for popup-closed-by-user */}
              {isPopupClosedByUser && (
                <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-xs text-sky-950 dark:text-sky-200 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-sky-950 dark:text-sky-100">
                    <ShieldAlert className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Why did this happen even if you didn't close it?</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-sky-900 dark:text-sky-300">
                    Modern browsers (Chrome third-party cookie partitioning, Safari ITP, Brave Shields, or popup blockers) block cross-domain authentication popups and terminate the connection before Google can pass the token back.
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleRedirectConnect}
                      disabled={redirecting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                    >
                      <Compass className="w-4 h-4" />
                      <span>{redirecting ? 'Redirecting to Google...' : 'Sign In using Full-Page Redirect (Guaranteed)'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[10px] text-center text-sky-700 dark:text-sky-400 mt-1.5">
                      Redirect mode bypasses all popup blockers and cross-origin restrictions.
                    </p>
                  </div>
                </div>
              )}

              {/* Special Guided Resolution for auth/unauthorized-domain */}
              {isUnauthorizedDomain && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-amber-950 dark:text-amber-100">
                    <span>How to fix in 1 minute:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Firebase blocks OAuth popups on any domain not explicitly added to its authorized domains list.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-amber-950 dark:text-amber-100">
                      Step 1: Copy your current domain
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/50 font-mono text-xs select-all text-amber-950 dark:text-amber-100">
                        {currentHostname || 'your-site.onrender.com'}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDomain ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <span className="font-semibold block text-amber-950 dark:text-amber-100">
                      Step 2: Add it to Firebase Authorized Domains
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300">
                      <li>Open Firebase Authentication Settings using the link below.</li>
                      <li>Scroll down to the <strong>Authorized domains</strong> section.</li>
                      <li>Click <strong>Add domain</strong> and paste your domain (e.g. <code>{currentHostname || 'your-site.onrender.com'}</code>).</li>
                      <li>Click <strong>Save</strong> and try signing in again!</li>
                    </ol>
                  </div>

                  <a
                    href={firebaseSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-xs transition"
                  >
                    <span>Open Firebase Authorized Domains Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* GOOGLE PROVIDER */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-medium text-blue-900 dark:text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Google Workspace Security Notice</span>
                </div>
                <p>
                  Connecting allows Email Cleaner to scan your messages in increments of 500 to identify top sender domains and move unwanted emails to trash with your explicit confirmation.
                </p>
              </div>

              <div className="pt-2 space-y-2.5">
                {/* Method 1: Standard Popup */}
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={loading || redirecting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{loading ? 'Opening Google Sign-in...' : 'Sign in with Google (Popup)'}</span>
                </button>

                {/* Method 2: Redirect Fallback */}
                <div className="text-center">
                  <span className="text-[11px] text-slate-400">or if popups are blocked on your browser:</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleRedirectConnect}
                  disabled={loading || redirecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{redirecting ? 'Redirecting to Google...' : 'Sign in with Full-Page Redirect'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MICROSOFT PROVIDER */}
          {activeTab === 'microsoft' && (
            <form onSubmit={handleMicrosoftConnect} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300">
                Connect via Microsoft Graph API. You can generate an access token via Microsoft Entra / Azure Portal with <code>Mail.ReadWrite</code> permission, or paste your account token.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="user@outlook.com or user@company.com"
                  value={msEmail}
                  onChange={(e) => setMsEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Microsoft Graph Access Token <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="eyJ0eXAiOiJKV1QiLC..."
                  value={msToken}
                  onChange={(e) => setMsToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMsEmail('demo.user@outlook.com');
                    setMsToken('mock_ms_graph_token_demo_mode');
                  }}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  Fill Demo Microsoft Token
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition shadow-sm cursor-pointer"
              >
                Connect Microsoft Inbox
              </button>
            </form>
          )}

          {/* YAHOO / IMAP PROVIDER */}
          {activeTab === 'yahoo' && (
            <form onSubmit={handleYahooConnect} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-xs text-purple-800 dark:text-purple-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  Requires Yahoo App Password
                </p>
                <p>
                  Yahoo accounts require an <strong>App Password</strong> (not your regular login password). Generate one in{' '}
                  <a
                    href="https://login.yahoo.com/account/security"
                    target="_blank"
                    rel="noreferrer"
                    className="underline inline-flex items-center gap-0.5 text-purple-900 dark:text-purple-200"
                  >
                    Yahoo Account Security <ExternalLink className="w-3 h-3" />
                  </a>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Yahoo / IMAP Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@yahoo.com"
                  value={yahooUser}
                  onChange={(e) => setYahooUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Yahoo 16-character App Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={yahooPass}
                  onChange={(e) => setYahooPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedImap(!showAdvancedImap)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer"
                >
                  {showAdvancedImap ? '− Hide IMAP Server Settings' : '+ Custom IMAP Server Settings'}
                </button>
              </div>

              {showAdvancedImap && (
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">IMAP Host</label>
                    <input
                      type="text"
                      value={customHost}
                      onChange={(e) => setCustomHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Port</label>
                    <input
                      type="text"
                      value={customPort}
                      onChange={(e) => setCustomPort(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition shadow-sm cursor-pointer"
              >
                Connect Yahoo Mailbox
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
