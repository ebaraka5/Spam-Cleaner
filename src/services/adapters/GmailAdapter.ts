import type { EmailProviderAdapter, BatchScanResult, DomainGroup, MessagePreview } from '../../types/provider.ts';
import { extractDomain, categorizeDomain } from '../../utils/domainParser.ts';

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        // Rate limit backoff
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      return res;
    } catch {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

export class GmailAdapter implements EmailProviderAdapter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async scanBatch(cursor?: string, queryFilter: string = 'in:inbox'): Promise<BatchScanResult> {
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    listUrl.searchParams.set('maxResults', '500');
    listUrl.searchParams.set('q', queryFilter);
    if (cursor) {
      listUrl.searchParams.set('pageToken', cursor);
    }

    const listRes = await fetchWithRetry(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!listRes || !listRes.ok) {
      const status = listRes ? listRes.status : 'Network error';
      throw new Error(`Gmail API messages list failed: ${status}`);
    }

    const listData = await listRes.json();
    const messages: Array<{ id: string }> = listData.messages || [];
    const nextPageToken: string | null = listData.nextPageToken || null;

    if (messages.length === 0) {
      return {
        domains: {},
        nextCursor: null,
        totalScanned: 0,
        recentPreviews: [],
      };
    }

    const domains: Record<string, DomainGroup> = {};
    const recentPreviews: MessagePreview[] = [];

    // Fetch metadata in controlled chunks of 15 with 50ms pause to stay within Gmail 250 units/sec quota
    const CHUNK_SIZE = 15;
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const slice = messages.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        slice.map(async (msg) => {
          const metaUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`;
          const metaRes = await fetchWithRetry(metaUrl, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          });
          if (!metaRes || !metaRes.ok) return null;
          return await metaRes.json().catch(() => null);
        })
      );

      for (const item of results) {
        if (!item || !item.id) continue;
        const headers: Array<{ name: string; value: string }> = item.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();

        const { domain, email, name: senderName } = extractDomain(fromHeader);
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

        // Store up to 10 recent previews for user visibility
        if (recentPreviews.length < 10) {
          recentPreviews.push({
            id: item.id,
            sender: senderName ? `${senderName} (${email})` : email,
            subject: subjectHeader,
            date: dateHeader,
            snippet: item.snippet || '',
          });
        }
      }

      // Small pause between chunks to respect rate limits
      if (i + CHUNK_SIZE < messages.length) {
        await new Promise((r) => setTimeout(r, 45));
      }
    }

    return {
      domains,
      nextCursor: nextPageToken,
      totalScanned: messages.length,
      recentPreviews,
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
