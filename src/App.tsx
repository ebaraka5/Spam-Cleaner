/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Inbox,
  CheckCircle,
  Loader2,
  Trash2,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import type {
  ProviderType,
  DomainGroup,
  EmailAccount,
  EmailProviderAdapter,
  BatchScanResult,
  MessagePreview
} from './types/provider.ts';
import { GmailAdapter } from './services/adapters/GmailAdapter.ts';
import { MicrosoftGraphAdapter } from './services/adapters/MicrosoftGraphAdapter.ts';
import { YahooImapAdapter } from './services/adapters/YahooImapAdapter.ts';
import { DemoAdapter } from './services/adapters/DemoAdapter.ts';
import { initAuth, logout as googleLogout, getStoredToken, getStoredEmail } from './services/firebaseAuth.ts';
import { triggerPurgeConfetti } from './utils/confetti.ts';

import { Header } from './components/Header.tsx';
import { ScanProgressHeader } from './components/ScanProgressHeader.tsx';
import { DomainTable } from './components/DomainTable.tsx';
import { ConfirmationModal } from './components/ConfirmationModal.tsx';
import { DomainDetailsModal } from './components/DomainDetailsModal.tsx';
import { ConnectModal } from './components/ConnectModal.tsx';

interface ProviderState {
  domains: Record<string, DomainGroup>;
  cursor: string | null;
  totalScanned: number;
  batchNumber: number;
  totalCleaned: number;
  reclaimedStorageMb: number;
  hasMore: boolean;
  protectedDomains: Set<string>;
}

const DEFAULT_PROVIDER_STATE: ProviderState = {
  domains: {},
  cursor: null,
  totalScanned: 0,
  batchNumber: 0,
  totalCleaned: 0,
  reclaimedStorageMb: 0,
  hasMore: true,
  protectedDomains: new Set(['chase.com', 'service.paypal.com', 'receipts.apple.com']),
};

const getInitialProvider = (): ProviderType => {
  try {
    const saved = sessionStorage.getItem('ec_active_provider') || localStorage.getItem('ec_active_provider');
    if (saved && (saved === 'google' || saved === 'microsoft' || saved === 'yahoo' || saved === 'demo')) {
      return saved as ProviderType;
    }
    const token = getStoredToken();
    if (token) return 'google';
  } catch {
    // ignore
  }
  return 'demo';
};

export default function App() {
  const initialGoogleToken = getStoredToken();
  const initialGoogleEmail = getStoredEmail();

  const [currentProvider, setCurrentProvider] = useState<ProviderType>(getInitialProvider);
  const [accounts, setAccounts] = useState<Record<ProviderType, EmailAccount>>({
    google: {
      id: 'google',
      provider: 'google',
      email: initialGoogleEmail || (initialGoogleToken ? 'Google Account' : 'Not Connected'),
      isConnected: !!initialGoogleToken,
      accessToken: initialGoogleToken || undefined,
    },
    microsoft: { id: 'microsoft', provider: 'microsoft', email: 'Not Connected', isConnected: false },
    yahoo: { id: 'yahoo', provider: 'yahoo', email: 'Not Connected', isConnected: false },
    demo: { id: 'demo', provider: 'demo', email: 'alex.demo.user@example.com', name: 'Demo Inbox (2,500 Emails)', isConnected: true },
  });

  // Track if a provider has already executed an automatic scan in this session to prevent looping
  const hasAutoScannedRef = useRef<Record<ProviderType, boolean>>({
    google: false,
    microsoft: false,
    yahoo: false,
    demo: false,
  });

  // Independent state per provider
  const [states, setStates] = useState<Record<ProviderType, ProviderState>>({
    google: { ...DEFAULT_PROVIDER_STATE, protectedDomains: new Set() },
    microsoft: { ...DEFAULT_PROVIDER_STATE, protectedDomains: new Set() },
    yahoo: { ...DEFAULT_PROVIDER_STATE, protectedDomains: new Set() },
    demo: { ...DEFAULT_PROVIDER_STATE },
  });

  const [selectedDomainNames, setSelectedDomainNames] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const autoScanRef = useRef(false);

  // Scan folder scope filter and previews
  const [queryFilter, setQueryFilter] = useState<string>('in:inbox');
  const [recentPreviews, setRecentPreviews] = useState<Record<ProviderType, MessagePreview[]>>({
    google: [],
    microsoft: [],
    yahoo: [],
    demo: [],
  });

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [domainsToPurge, setDomainsToPurge] = useState<Array<{ domain: string; group: DomainGroup }>>([]);

  const [inspectDomain, setInspectDomain] = useState<{ domain: string; group: DomainGroup } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle?: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Synchronized refs to completely eliminate any React stale closure bugs during async scans
  const currentProviderRef = useRef<ProviderType>(currentProvider);
  currentProviderRef.current = currentProvider;

  const accountsRef = useRef<Record<ProviderType, EmailAccount>>(accounts);
  accountsRef.current = accounts;

  const statesRef = useRef<Record<ProviderType, ProviderState>>(states);
  statesRef.current = states;

  const queryFilterRef = useRef<string>(queryFilter);
  queryFilterRef.current = queryFilter;

  const isScanningRef = useRef<boolean>(isScanning);
  isScanningRef.current = isScanning;

  // Active state shortcuts
  const activeState = states[currentProvider];
  const activeAccount = accounts[currentProvider];

  // Show toast notification
  const showToast = useCallback((title: string, subtitle?: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ title, subtitle, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Factory to instantiate the correct EmailProviderAdapter given explicit provider & token
  const getAdapterFor = useCallback((provider: ProviderType, tokenOverride?: string): EmailProviderAdapter => {
    switch (provider) {
      case 'google': {
        const token = tokenOverride || accountsRef.current.google.accessToken;
        if (!token) throw new Error('Gmail account not connected. Please sign in first.');
        return new GmailAdapter(token);
      }
      case 'microsoft': {
        const token = tokenOverride || accountsRef.current.microsoft.accessToken;
        if (!token) throw new Error('Microsoft account not connected. Please provide an access token.');
        return new MicrosoftGraphAdapter(token);
      }
      case 'yahoo': {
        const creds = accountsRef.current.yahoo.imapConfig;
        if (!creds || !creds.user || !creds.pass) {
          throw new Error('Yahoo account not connected. Please provide email and App Password.');
        }
        return new YahooImapAdapter(creds);
      }
      case 'demo':
      default:
        return new DemoAdapter();
    }
  }, []);

  // Scan single batch (up to 500 emails) with explicit provider & token overrides
  const scanBatch = useCallback(
    async (
      cursorOverride?: string | null,
      filterOverride?: string,
      providerOverride?: ProviderType,
      tokenOverride?: string
    ): Promise<BatchScanResult | null> => {
      const targetProvider = providerOverride || currentProviderRef.current;
      const targetAccount = accountsRef.current[targetProvider];
      const targetToken = tokenOverride || targetAccount?.accessToken;

      if (!targetAccount.isConnected && !tokenOverride && targetProvider !== 'demo') {
        showToast('Account Required', `Please connect your ${targetProvider.toUpperCase()} account to scan.`, 'info');
        return null;
      }

      if (isScanningRef.current) {
        return null;
      }

      setIsScanning(true);
      isScanningRef.current = true;
      try {
        const adapter = getAdapterFor(targetProvider, targetToken);
        const currentState = statesRef.current[targetProvider];
        const cursorToUse = cursorOverride !== undefined ? cursorOverride : currentState.cursor;
        const filterToUse = filterOverride !== undefined ? filterOverride : queryFilterRef.current;
        const result = await adapter.scanBatch(cursorToUse || undefined, filterToUse);

        // Store previews
        if (result.recentPreviews && result.recentPreviews.length > 0) {
          setRecentPreviews((prev) => ({
            ...prev,
            [targetProvider]: result.recentPreviews || [],
          }));
        }

        // Aggregate domains into targetProvider state
        setStates((prev) => {
          const current = prev[targetProvider];
          const updatedDomains = { ...current.domains };

          for (const [domain, newGroup] of Object.entries(result.domains)) {
            if (!updatedDomains[domain]) {
              updatedDomains[domain] = { ...newGroup };
            } else {
              const existing = updatedDomains[domain];
              existing.count += newGroup.count;
              existing.messageIds = Array.from(new Set([...existing.messageIds, ...newGroup.messageIds]));
              existing.estimatedSizeKb = (existing.estimatedSizeKb || 0) + (newGroup.estimatedSizeKb || 0);

              if (newGroup.sampleSubjects) {
                const combinedSubjects = Array.from(new Set([...(existing.sampleSubjects || []), ...newGroup.sampleSubjects]));
                existing.sampleSubjects = combinedSubjects.slice(0, 5);
              }
              if (newGroup.sampleSenders) {
                const combinedSenders = Array.from(new Set([...(existing.sampleSenders || []), ...newGroup.sampleSenders]));
                existing.sampleSenders = combinedSenders.slice(0, 3);
              }
            }
          }

          const nextState: ProviderState = {
            ...current,
            domains: updatedDomains,
            cursor: result.nextCursor,
            totalScanned: current.totalScanned + result.totalScanned,
            batchNumber: current.batchNumber + 1,
            hasMore: result.nextCursor !== null && result.totalScanned > 0,
          };

          statesRef.current = {
            ...statesRef.current,
            [targetProvider]: nextState,
          };

          return {
            ...prev,
            [targetProvider]: nextState,
          };
        });

        return result;
      } catch (err: unknown) {
        const error = err as { message?: string };
        showToast('Scan Failed', error.message || 'Could not fetch batch', 'error');
        autoScanRef.current = false;
        setIsAutoScanning(false);
        return null;
      } finally {
        setIsScanning(false);
        isScanningRef.current = false;
      }
    },
    [getAdapterFor, showToast]
  );

  // Initialize Firebase Auth Listener for Google
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        const updatedGoogle: EmailAccount = {
          id: 'google',
          provider: 'google',
          email: user.email || 'Google User',
          name: user.displayName || undefined,
          isConnected: true,
          accessToken: token,
        };

        setAccounts((prev) => ({
          ...prev,
          google: updatedGoogle,
        }));
        accountsRef.current.google = updatedGoogle;

        try {
          sessionStorage.setItem('ec_active_provider', 'google');
          localStorage.setItem('ec_active_provider', 'google');
        } catch {}

        setCurrentProvider('google');
        currentProviderRef.current = 'google';

        showToast('Google Connected', `Signed in as ${user.email || 'Google User'}.`, 'success');

        // Automatically scan Google messages ONLY ONCE per session
        if (!hasAutoScannedRef.current.google && statesRef.current.google.totalScanned === 0) {
          hasAutoScannedRef.current.google = true;
          scanBatch(null, queryFilterRef.current, 'google', token);
        }
      },
      () => {
        // Only mark disconnected if there is genuinely no stored token
        const existingToken = getStoredToken();
        if (!existingToken) {
          const disconnected: EmailAccount = {
            id: 'google',
            provider: 'google',
            email: 'Not Connected',
            isConnected: false,
            accessToken: undefined,
          };
          setAccounts((prev) => ({
            ...prev,
            google: disconnected,
          }));
          accountsRef.current.google = disconnected;
        }
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [scanBatch, showToast]);

  // Auto scan continuously in 500-batch increments until done or cancelled
  const handleToggleAutoScan = async () => {
    if (isAutoScanning) {
      autoScanRef.current = false;
      setIsAutoScanning(false);
      return;
    }

    if (!activeAccount.isConnected && currentProvider !== 'demo') {
      setIsConnectModalOpen(true);
      return;
    }

    autoScanRef.current = true;
    setIsAutoScanning(true);

    let nextCur: string | null = statesRef.current[currentProvider].cursor;
    while (autoScanRef.current) {
      const res = await scanBatch(nextCur, queryFilterRef.current, currentProvider);
      if (!res || !res.nextCursor || res.totalScanned === 0) {
        break;
      }
      nextCur = res.nextCursor;
      // Brief breathing delay between batches
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    autoScanRef.current = false;
    setIsAutoScanning(false);
    showToast('Auto-Scan Completed', 'All available batches have been aggregated.', 'info');
  };

  // Reset analysis
  const handleResetScan = async () => {
    if (currentProvider === 'demo') {
      try {
        const demoAdapter = new DemoAdapter();
        await demoAdapter.resetDemo();
      } catch {
        // ignore
      }
    }

    setStates((prev) => ({
      ...prev,
      [currentProvider]: {
        ...DEFAULT_PROVIDER_STATE,
        protectedDomains: prev[currentProvider].protectedDomains,
      },
    }));
    setSelectedDomainNames(new Set());
    showToast('Reset Complete', 'Inbox scan state cleared.', 'info');
  };

  // Delete batch execution (moves to trash or permanently deletes)
  const executePurge = async (permanent: boolean) => {
    if (domainsToPurge.length === 0) return;

    const adapter = getAdapterFor(currentProvider);
    const allMessageIds = domainsToPurge.flatMap((d) => d.group.messageIds);
    const domainNames = new Set(domainsToPurge.map((d) => d.domain));

    const result = await adapter.deleteBatch(allMessageIds, permanent);

    if (result.success) {
      // Calculate reclaimed size
      const reclaimedKb = domainsToPurge.reduce((acc, d) => acc + (d.group.estimatedSizeKb || 25), 0);
      const reclaimedMb = reclaimedKb / 1024;

      setStates((prev) => {
        const current = prev[currentProvider];
        const nextDomains = { ...current.domains };
        for (const name of domainNames) {
          delete nextDomains[name];
        }

        const nextState: ProviderState = {
          ...current,
          domains: nextDomains,
          totalCleaned: current.totalCleaned + result.count,
          reclaimedStorageMb: current.reclaimedStorageMb + reclaimedMb,
        };

        statesRef.current = {
          ...statesRef.current,
          [currentProvider]: nextState,
        };

        return {
          ...prev,
          [currentProvider]: nextState,
        };
      });

      // Clear selection
      setSelectedDomainNames((prev) => {
        const next = new Set(prev);
        for (const name of domainNames) {
          next.delete(name);
        }
        return next;
      });

      triggerPurgeConfetti();
      showToast(
        `Purged ${result.count.toLocaleString()} Emails!`,
        `Successfully cleaned ${domainsToPurge.length} domain(s). Freed ~${reclaimedMb.toFixed(1)} MB storage.`,
        'success'
      );
    }
  };

  // Single Domain delete trigger
  const handleDeleteSingleDomain = (domain: string, group: DomainGroup) => {
    setDomainsToPurge([{ domain, group }]);
    setIsConfirmModalOpen(true);
  };

  // Bulk Selected delete trigger
  const handleTriggerBulkDelete = () => {
    const list: Array<{ domain: string; group: DomainGroup }> = [];
    for (const d of selectedDomainNames) {
      if (activeState.domains[d] && !activeState.protectedDomains.has(d)) {
        list.push({ domain: d, group: activeState.domains[d] });
      }
    }
    if (list.length === 0) return;
    setDomainsToPurge(list);
    setIsConfirmModalOpen(true);
  };

  // Toggle domain protection
  const handleToggleProtect = (domain: string) => {
    setStates((prev) => {
      const current = prev[currentProvider];
      const nextProtected = new Set(current.protectedDomains);
      if (nextProtected.has(domain)) {
        nextProtected.delete(domain);
        showToast('Domain Unprotected', `${domain} can now be selected for purge.`, 'info');
      } else {
        nextProtected.add(domain);
        // Also remove from selection if it was selected
        setSelectedDomainNames((s) => {
          const sNext = new Set(s);
          sNext.delete(domain);
          return sNext;
        });
        showToast('Domain Shielded', `${domain} is protected from accidental deletion.`, 'info');
      }

      const nextState: ProviderState = {
        ...current,
        protectedDomains: nextProtected,
      };

      statesRef.current = {
        ...statesRef.current,
        [currentProvider]: nextState,
      };

      return {
        ...prev,
        [currentProvider]: nextState,
      };
    });
  };

  // Selection handlers
  const handleToggleSelect = (domain: string) => {
    if (activeState.protectedDomains.has(domain)) return;
    setSelectedDomainNames((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const handleSelectAll = (domainList: string[]) => {
    setSelectedDomainNames(new Set(domainList.filter((d) => !activeState.protectedDomains.has(d))));
  };

  const handleClearSelection = () => {
    setSelectedDomainNames(new Set());
  };

  const handleQueryFilterChange = async (newFilter: string) => {
    setQueryFilter(newFilter);
    queryFilterRef.current = newFilter;
    setStates((prev) => {
      const next = {
        ...prev,
        [currentProvider]: {
          ...DEFAULT_PROVIDER_STATE,
          protectedDomains: prev[currentProvider].protectedDomains,
        },
      };
      statesRef.current = next;
      return next;
    });
    setSelectedDomainNames(new Set());
    setRecentPreviews((prev) => ({
      ...prev,
      [currentProvider]: [],
    }));
    showToast('Scope Updated', `Switched scan scope to "${newFilter}". Scanning...`, 'info');
    scanBatch(null, newFilter, currentProvider);
  };

  // Connect callbacks
  const handleConnectGoogle = (token: string, user: { email: string; name?: string }) => {
    try {
      sessionStorage.setItem('ec_active_provider', 'google');
      localStorage.setItem('ec_active_provider', 'google');
    } catch {
      // ignore
    }

    const updatedGoogle: EmailAccount = {
      id: 'google',
      provider: 'google',
      email: user.email,
      name: user.name,
      isConnected: true,
      accessToken: token,
    };

    setAccounts((prev) => ({
      ...prev,
      google: updatedGoogle,
    }));
    accountsRef.current.google = updatedGoogle;

    setCurrentProvider('google');
    currentProviderRef.current = 'google';
    setSelectedDomainNames(new Set());

    showToast('Google Connected', `Signed in as ${user.email}. Scanning your real inbox...`, 'success');
    hasAutoScannedRef.current.google = true;
    scanBatch(null, queryFilterRef.current, 'google', token);
  };

  const handleConnectMicrosoft = (token: string, email: string) => {
    try {
      sessionStorage.setItem('ec_active_provider', 'microsoft');
      localStorage.setItem('ec_active_provider', 'microsoft');
    } catch {
      // ignore
    }

    const updatedMs: EmailAccount = {
      id: 'microsoft',
      provider: 'microsoft',
      email,
      isConnected: true,
      accessToken: token,
    };

    setAccounts((prev) => ({
      ...prev,
      microsoft: updatedMs,
    }));
    accountsRef.current.microsoft = updatedMs;

    setCurrentProvider('microsoft');
    currentProviderRef.current = 'microsoft';
    setSelectedDomainNames(new Set());

    showToast('Microsoft Connected', `Connected as ${email}. Scanning...`, 'success');
    scanBatch(null, queryFilterRef.current, 'microsoft', token);
  };

  const handleConnectYahoo = (creds: { user: string; pass: string; host?: string; port?: number }) => {
    try {
      sessionStorage.setItem('ec_active_provider', 'yahoo');
      localStorage.setItem('ec_active_provider', 'yahoo');
    } catch {
      // ignore
    }

    const updatedYahoo: EmailAccount = {
      id: 'yahoo',
      provider: 'yahoo',
      email: creds.user,
      isConnected: true,
      imapConfig: creds,
    };

    setAccounts((prev) => ({
      ...prev,
      yahoo: updatedYahoo,
    }));
    accountsRef.current.yahoo = updatedYahoo;

    setCurrentProvider('yahoo');
    currentProviderRef.current = 'yahoo';
    setSelectedDomainNames(new Set());

    showToast('Yahoo Mail Connected', `Authenticated IMAP for ${creds.user}. Scanning...`, 'success');
    scanBatch(null, queryFilterRef.current, 'yahoo');
  };

  const handleDisconnectProvider = async (provider: ProviderType) => {
    if (provider === 'google') {
      await googleLogout();
      hasAutoScannedRef.current.google = false;
    }
    const disconnectedAccount: EmailAccount = {
      id: provider,
      provider,
      email: 'Not Connected',
      isConnected: false,
      accessToken: undefined,
      imapConfig: undefined,
    };

    setAccounts((prev) => ({
      ...prev,
      [provider]: disconnectedAccount,
    }));
    accountsRef.current[provider] = disconnectedAccount;

    if (currentProvider === provider) {
      try {
        sessionStorage.setItem('ec_active_provider', 'demo');
        localStorage.setItem('ec_active_provider', 'demo');
      } catch {
        // ignore
      }
      setCurrentProvider('demo');
      currentProviderRef.current = 'demo';
    }

    showToast('Account Disconnected', `${provider} account unlinked.`, 'info');
  };

  // Count total selected emails
  const selectedEmailsCount = Array.from(selectedDomainNames).reduce((acc, d) => {
    return acc + (activeState.domains[d]?.count || 0);
  }, 0);

  // Initial trigger for Demo sandbox on first load so user immediately sees rich data ONLY if not on google
  const hasLoadedInitialDemo = useRef(false);
  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem('ec_google_access_token') : null;
    const storedProvider = typeof window !== 'undefined' ? sessionStorage.getItem('ec_active_provider') : null;
    if (storedToken || storedProvider === 'google') {
      return;
    }
    if (!hasLoadedInitialDemo.current && currentProvider === 'demo' && activeState.totalScanned === 0) {
      hasLoadedInitialDemo.current = true;
      scanBatch(null, queryFilterRef.current, 'demo');
    }
  }, [currentProvider, activeState.totalScanned, scanBatch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-sm p-4 rounded-2xl shadow-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4 flex items-start gap-3">
          {toastMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
          {toastMessage.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{toastMessage.title}</h4>
            {toastMessage.subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{toastMessage.subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* App Header */}
      <Header
        currentProvider={currentProvider}
        onSelectProvider={(p) => {
          try {
            sessionStorage.setItem('ec_active_provider', p);
          } catch {
            // ignore
          }
          setCurrentProvider(p);
          currentProviderRef.current = p;
          setSelectedDomainNames(new Set());

          // Automatically scan if switching to connected Google or Demo with 0 scanned emails
          if (p === 'google' && accountsRef.current.google.isConnected && statesRef.current.google.totalScanned === 0 && !isScanningRef.current) {
            scanBatch(null, queryFilterRef.current, 'google', accountsRef.current.google.accessToken);
          } else if (p === 'demo' && statesRef.current.demo.totalScanned === 0 && !isScanningRef.current) {
            scanBatch(null, queryFilterRef.current, 'demo');
          }
        }}
        accounts={accounts}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onDisconnectProvider={handleDisconnectProvider}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Unconnected Banner if provider is not connected */}
        {!activeAccount.isConnected && (
          <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Connect your {currentProvider === 'google' ? 'Gmail' : currentProvider === 'microsoft' ? 'Microsoft Outlook' : 'Yahoo'} inbox
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Link your account to scan emails in batches of 500, aggregate domain senders, and purge unwanted subscriptions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition shrink-0"
            >
              Connect {currentProvider.toUpperCase()} Account
            </button>
          </div>
        )}

        {/* Progress & Batch Scanning Engine */}
        <ScanProgressHeader
          provider={currentProvider}
          accountEmail={activeAccount.email}
          accountName={activeAccount.name}
          totalScanned={activeState.totalScanned}
          totalDomainsCount={Object.keys(activeState.domains).length}
          totalCleanedCount={activeState.totalCleaned}
          reclaimedStorageMb={activeState.reclaimedStorageMb}
          currentCursor={activeState.cursor}
          batchNumber={activeState.batchNumber}
          isScanning={isScanning}
          isAutoScanning={isAutoScanning}
          onScanNextBatch={() => scanBatch(undefined, undefined, currentProvider)}
          onToggleAutoScan={handleToggleAutoScan}
          onResetScan={handleResetScan}
          hasMoreBatches={activeState.hasMore}
          selectedDomainsCount={selectedDomainNames.size}
          selectedEmailsCount={selectedEmailsCount}
          onTriggerBulkDelete={handleTriggerBulkDelete}
          queryFilter={queryFilter}
          onQueryFilterChange={handleQueryFilterChange}
          recentPreviews={recentPreviews[currentProvider] || []}
        />

        {/* Domain Aggregation Table */}
        <DomainTable
          domains={activeState.domains}
          totalScanned={activeState.totalScanned}
          selectedDomainNames={selectedDomainNames}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onDeleteSingleDomain={handleDeleteSingleDomain}
          onOpenDetails={(domain, group) => setInspectDomain({ domain, group })}
          protectedDomains={activeState.protectedDomains}
          onToggleProtect={handleToggleProtect}
        />
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executePurge}
        selectedDomains={domainsToPurge}
      />

      {/* Domain Details / Samples Modal */}
      <DomainDetailsModal
        isOpen={inspectDomain !== null}
        onClose={() => setInspectDomain(null)}
        domain={inspectDomain?.domain || ''}
        group={inspectDomain?.group || null}
        onDeleteDomain={handleDeleteSingleDomain}
        onToggleProtect={handleToggleProtect}
        isProtected={inspectDomain ? activeState.protectedDomains.has(inspectDomain.domain) : false}
      />

      {/* Connect Account Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        provider={currentProvider}
        onConnectGoogle={handleConnectGoogle}
        onConnectMicrosoft={handleConnectMicrosoft}
        onConnectYahoo={handleConnectYahoo}
      />
    </div>
  );
}
