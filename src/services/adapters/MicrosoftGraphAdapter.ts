import type { EmailProviderAdapter, BatchScanResult } from '../../types/provider.ts';

export class MicrosoftGraphAdapter implements EmailProviderAdapter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    const res = await fetch('/api/graph/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ cursor }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Microsoft Graph scan failed' }));
      throw new Error(err.error || `Microsoft scan failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async deleteBatch(messageIds: string[], _permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/graph/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ messageIds }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Microsoft Graph delete failed' }));
      throw new Error(err.error || `Microsoft delete failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async getAccountInfo() {
    return {
      email: 'Microsoft Outlook Account',
      name: 'Outlook / Office 365 User',
      provider: 'microsoft' as const,
    };
  }
}
