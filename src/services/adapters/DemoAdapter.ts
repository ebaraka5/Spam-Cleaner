import type { EmailProviderAdapter, BatchScanResult } from '../../types/provider.ts';

export class DemoAdapter implements EmailProviderAdapter {
  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    const res = await fetch('/api/demo/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cursor }),
    });

    if (!res.ok) {
      throw new Error('Failed to scan demo inbox');
    }

    return res.json();
  }

  async deleteBatch(messageIds: string[], _permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/demo/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds }),
    });

    if (!res.ok) {
      throw new Error('Failed to delete messages from demo inbox');
    }

    return res.json();
  }

  async resetDemo(): Promise<void> {
    await fetch('/api/demo/reset', { method: 'POST' });
  }

  async getAccountInfo() {
    return {
      email: 'alex.demo.user@example.com',
      name: 'Alex Vance (Sample Inbox)',
      provider: 'demo' as const,
    };
  }
}
