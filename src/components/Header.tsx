import React from 'react';
import { Mail, CheckCircle2, AlertCircle, LogOut, Link2, Sparkles, Shield } from 'lucide-react';
import type { ProviderType, EmailAccount } from '../types/provider.ts';

interface HeaderProps {
  currentProvider: ProviderType;
  onSelectProvider: (provider: ProviderType) => void;
  accounts: Record<ProviderType, EmailAccount>;
  onOpenConnectModal: (provider: ProviderType) => void;
  onDisconnectProvider: (provider: ProviderType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProvider,
  onSelectProvider,
  accounts,
  onOpenConnectModal,
  onDisconnectProvider,
}) => {
  const currentAccount = accounts[currentProvider];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Email Cleaner
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold tracking-wide uppercase border border-indigo-200 dark:border-indigo-800">
                  500-Batch Engine
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                Multi-provider domain aggregation & bulk purge
              </p>
            </div>
          </div>

          {/* Account Status / Connect Button */}
          <div className="flex items-center gap-3">
            {currentAccount.isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                    {currentAccount.name || currentAccount.email}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                </div>
                {currentProvider !== 'demo' && (
                  <button
                    type="button"
                    title="Disconnect account"
                    onClick={() => onDisconnectProvider(currentProvider)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenConnectModal(currentProvider)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Connect Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Provider Switcher Tabs */}
        <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar">
          {/* Google */}
          <button
            type="button"
            onClick={() => onSelectProvider('google')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              currentProvider === 'google'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Google Gmail</span>
            {accounts.google.isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Microsoft */}
          <button
            type="button"
            onClick={() => onSelectProvider('microsoft')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              currentProvider === 'microsoft'
                ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="w-4 h-4 rounded-sm bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center">
              M
            </div>
            <span>Microsoft 365 / Outlook</span>
            {accounts.microsoft.isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Yahoo */}
          <button
            type="button"
            onClick={() => onSelectProvider('yahoo')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              currentProvider === 'yahoo'
                ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="w-4 h-4 rounded-sm bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
              Y!
            </div>
            <span>Yahoo Mail (IMAP)</span>
            {accounts.yahoo.isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Demo Sandbox */}
          <button
            type="button"
            onClick={() => onSelectProvider('demo')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              currentProvider === 'demo'
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sample Demo Sandbox (2,500 Emails)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] text-amber-900 dark:text-amber-100 font-bold">
              Instant
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
