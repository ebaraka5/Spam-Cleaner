import type { EmailProviderAdapter, BatchScanResult } from '../../types/provider.ts';

export class GmailAdapter implements EmailProviderAdapter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    const res = await fetch('/api/gmail/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ cursor }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Gmail scan failed' }));
      throw new Error(err.error || `Gmail scan failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async deleteBatch(messageIds: string[], permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/gmail/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ messageIds, permanent }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Gmail delete failed' }));
      throw new Error(err.error || `Gmail delete failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async getAccountInfo() {
    return {
      email: 'Google Gmail Account',
      name: 'Gmail User',
      provider: 'google' as const,
    };
  }
}
