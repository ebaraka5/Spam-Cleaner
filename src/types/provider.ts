// types/provider.ts

export type ProviderType = 'google' | 'microsoft' | 'yahoo' | 'demo';

export interface DomainGroup {
  count: number;
  messageIds: string[]; // string IDs for Gmail/Graph, UIDs for IMAP
  sampleSubjects?: string[];
  sampleSenders?: string[];
  lastDate?: string;
  category?: 'newsletters' | 'promotions' | 'social' | 'notifications' | 'receipts' | 'finance' | 'other';
  isSafeSender?: boolean;
  isProtected?: boolean;
  estimatedSizeKb?: number;
}

export interface BatchScanResult {
  domains: Record<string, DomainGroup>;
  nextCursor: string | null; // pageToken (Gmail), @odata.nextLink (Graph), or UID cursor (Yahoo)
  totalScanned: number;
  batchNumber?: number;
}

export interface EmailProviderAdapter {
  scanBatch(cursor?: string): Promise<BatchScanResult>;
  deleteBatch(messageIds: string[], permanent?: boolean): Promise<{ success: boolean; count: number }>;
  getAccountInfo?(): Promise<{ email: string; name?: string; provider: ProviderType }>;
}

export interface EmailAccount {
  id: string;
  provider: ProviderType;
  email: string;
  name?: string;
  avatarUrl?: string;
  isConnected: boolean;
  accessToken?: string;
  imapConfig?: {
    user: string;
    pass: string;
    host?: string;
    port?: number;
  };
}

export interface MessagePreview {
  id: string;
  sender: string;
  subject: string;
  date: string;
  snippet?: string;
}
