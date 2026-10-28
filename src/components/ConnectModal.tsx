import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Key, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ProviderType } from '../types/provider.ts';
import { googleSignIn } from '../services/firebaseAuth.ts';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Microsoft state
  const [msToken, setMsToken] = useState('');
  const [msEmail, setMsEmail] = useState('');

  // Yahoo state
  const [yahooUser, setYahooUser] = useState('');
  const [yahooPass, setYahooPass] = useState('');
  const [customHost, setCustomHost] = useState('imap.mail.yahoo.com');
  const [customPort, setCustomPort] = useState('993');
  const [showAdvancedImap, setShowAdvancedImap] = useState(false);

  if (!isOpen) return null;

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
      const error = err as { message?: string };
      setError(error.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
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
                {provider === 'google' && 'Connect Gmail Account'}
                {provider === 'microsoft' && 'Connect Microsoft 365 / Outlook'}
                {provider === 'yahoo' && 'Connect Yahoo Mail (IMAP)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Securely link your inbox for 500-batch domain analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* GOOGLE PROVIDER */}
          {provider === 'google' && (
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

              <div className="pt-2 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-60"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{loading ? 'Opening Google Sign-in...' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MICROSOFT PROVIDER */}
          {provider === 'microsoft' && (
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
                    // Populate test token for demo convenience
                    setMsEmail('demo.user@outlook.com');
                    setMsToken('mock_ms_graph_token_demo_mode');
                  }}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  Fill Demo Microsoft Token
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition shadow-sm"
              >
                Connect Microsoft Inbox
              </button>
            </form>
          )}

          {/* YAHOO / IMAP PROVIDER */}
          {provider === 'yahoo' && (
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
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
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
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition shadow-sm"
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
