import type { EmailProviderAdapter, BatchScanResult } from '../../types/provider.ts';

export interface ImapCredentials {
  user: string;
  pass: string;
  host?: string;
  port?: number;
}

export class YahooImapAdapter implements EmailProviderAdapter {
  private creds: ImapCredentials;

  constructor(creds: ImapCredentials) {
    this.creds = creds;
  }

  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    const res = await fetch('/api/imap/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.creds,
        cursor,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Yahoo IMAP scan failed' }));
      throw new Error(err.error || `Yahoo IMAP scan failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async deleteBatch(messageIds: string[], _permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/imap/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.creds,
        messageIds,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Yahoo IMAP delete failed' }));
      throw new Error(err.error || `Yahoo IMAP delete failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async getAccountInfo() {
    return {
      email: this.creds.user || 'Yahoo Account',
      name: 'Yahoo Mail User',
      provider: 'yahoo' as const,
    };
  }
}
