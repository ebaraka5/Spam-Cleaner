import type { EmailProviderAdapter, BatchScanResult, DomainGroup } from '../../types/provider.ts';
import { extractDomain, categorizeDomain } from '../../utils/domainParser.ts';

export class GmailAdapter implements EmailProviderAdapter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    listUrl.searchParams.set('maxResults', '500');
    listUrl.searchParams.set('q', 'in:inbox');
    if (cursor) {
      listUrl.searchParams.set('pageToken', cursor);
    }

    const listRes = await fetch(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({ error: { message: `HTTP ${listRes.status}` } }));
      const msg = err.error?.message || `Gmail API returned ${listRes.status}`;
      throw new Error(`Gmail API error: ${msg}`);
    }

    const listData = await listRes.json();
    const messages: Array<{ id: string }> = listData.messages || [];
    const nextPageToken: string | null = listData.nextPageToken || null;

    if (messages.length === 0) {
      return {
        domains: {},
        nextCursor: null,
        totalScanned: 0,
      };
    }

    const domains: Record<string, DomainGroup> = {};

    // Fetch metadata for messages in concurrent chunks
    const CHUNK_SIZE = 30;
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const slice = messages.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        slice.map(async (msg) => {
          try {
            const metaUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
            const metaRes = await fetch(metaUrl, {
              headers: { Authorization: `Bearer ${this.accessToken}` },
            });
            if (!metaRes.ok) return null;
            return await metaRes.json();
          } catch {
            return null;
          }
        })
      );

      for (const item of results) {
        if (!item || !item.id) continue;
        const headers = item.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateHeader = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();

        const { domain, email } = extractDomain(fromHeader);
        const catInfo = categorizeDomain(domain);

        if (!domains[domain]) {
          domains[domain] = {
            count: 0,
            messageIds: [],
            sampleSubjects: [],
            sampleSenders: [],
            lastDate: dateHeader,
            category: catInfo.category,
            isSafeSender: catInfo.isSafeSender,
            estimatedSizeKb: item.sizeEstimate ? Math.round(item.sizeEstimate / 1024) : 25,
          };
        }

        const group = domains[domain];
        group.count += 1;
        group.messageIds.push(item.id);

        if (group.sampleSubjects && group.sampleSubjects.length < 5 && !group.sampleSubjects.includes(subjectHeader)) {
          group.sampleSubjects.push(subjectHeader);
        }
        if (group.sampleSenders && group.sampleSenders.length < 3 && !group.sampleSenders.includes(email)) {
          group.sampleSenders.push(email);
        }
      }
    }

    return {
      domains,
      nextCursor: nextPageToken,
      totalScanned: messages.length,
    };
  }

  async deleteBatch(messageIds: string[], permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    if (!messageIds || messageIds.length === 0) {
      return { success: true, count: 0 };
    }

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < messageIds.length; i += CHUNK_SIZE) {
      const chunk = messageIds.slice(i, i + CHUNK_SIZE);

      if (permanent) {
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchDelete', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Failed to permanently delete messages (${res.status})`);
        }
      } else {
        // Move to Trash
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: chunk,
            removeLabelIds: ['INBOX'],
            addLabelIds: ['TRASH'],
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Failed to move messages to trash (${res.status})`);
        }
      }
    }

    return { success: true, count: messageIds.length };
  }

  async getAccountInfo() {
    return {
      email: 'Google Gmail Account',
      name: 'Gmail User',
      provider: 'google' as const,
    };
  }
}
