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
    try {
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

      // If static host returns HTML or 404
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(
          'Yahoo Mail IMAP requires a Node.js backend server for secure TCP socket communication. If deployed on Netlify static hosting, please run the full-stack server (server.ts) on a Node.js host or use Google Gmail / Microsoft / Demo mode in the static client.'
        );
      }

      return await res.json();
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message && error.message.includes('Node.js backend')) {
        throw error;
      }
      throw new Error(error.message || 'Yahoo IMAP scan failed. Please verify your email and 16-character App Password.');
    }
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
      throw new Error('Yahoo IMAP delete failed. Please check backend connection.');
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
