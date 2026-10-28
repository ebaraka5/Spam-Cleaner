import type { EmailProviderAdapter, BatchScanResult, DomainGroup } from '../../types/provider.ts';
import { extractDomain, categorizeDomain } from '../../utils/domainParser.ts';

export class MicrosoftGraphAdapter implements EmailProviderAdapter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    // If it's the test/demo token, return mock outlook inbox
    if (this.accessToken === 'mock_ms_graph_token_demo_mode') {
      const mockResult: BatchScanResult = {
        domains: {
          'teams.microsoft.com': {
            count: 24,
            messageIds: ['ms_msg_1', 'ms_msg_2'],
            sampleSubjects: ['You were mentioned in General', 'New message from Sarah'],
            sampleSenders: ['notifications@teams.microsoft.com'],
            category: 'notifications',
            isSafeSender: false,
            estimatedSizeKb: 650,
          },
          'sharepointonline.com': {
            count: 18,
            messageIds: ['ms_msg_3', 'ms_msg_4'],
            sampleSubjects: ['Quarterly Report was updated', 'Access request approved'],
            sampleSenders: ['no-reply@sharepointonline.com'],
            category: 'notifications',
            isSafeSender: false,
            estimatedSizeKb: 450,
          },
          'newsletters.bloomberg.com': {
            count: 32,
            messageIds: ['ms_msg_5', 'ms_msg_6'],
            sampleSubjects: ['Markets Today', 'Evening Wrap-Up'],
            sampleSenders: ['digest@newsletters.bloomberg.com'],
            category: 'newsletters',
            isSafeSender: false,
            estimatedSizeKb: 890,
          },
        },
        nextCursor: null,
        totalScanned: 74,
      };
      return mockResult;
    }

    const url = cursor && cursor.startsWith('http')
      ? cursor
      : 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=500&$select=id,from,subject,receivedDateTime';

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Microsoft Graph returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const messages = data.value || [];
    const nextLink = data['@odata.nextLink'] || null;

    const domains: Record<string, DomainGroup> = {};

    for (const msg of messages) {
      const fromAddr = msg.from?.emailAddress?.address || '';
      const { domain, email } = extractDomain(fromAddr);
      const catInfo = categorizeDomain(domain);

      if (!domains[domain]) {
        domains[domain] = {
          count: 0,
          messageIds: [],
          sampleSubjects: [],
          sampleSenders: [],
          lastDate: msg.receivedDateTime || new Date().toISOString(),
          category: catInfo.category,
          isSafeSender: catInfo.isSafeSender,
          estimatedSizeKb: 30,
        };
      }

      const group = domains[domain];
      group.count += 1;
      group.messageIds.push(msg.id);

      if (group.sampleSubjects && group.sampleSubjects.length < 5 && msg.subject && !group.sampleSubjects.includes(msg.subject)) {
        group.sampleSubjects.push(msg.subject);
      }
      if (group.sampleSenders && group.sampleSenders.length < 3 && email && !group.sampleSenders.includes(email)) {
        group.sampleSenders.push(email);
      }
    }

    return {
      domains,
      nextCursor: nextLink,
      totalScanned: messages.length,
    };
  }

  async deleteBatch(messageIds: string[], _permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    if (this.accessToken === 'mock_ms_graph_token_demo_mode') {
      return { success: true, count: messageIds.length };
    }

    const BATCH_SIZE = 20;
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const slice = messageIds.slice(i, i + BATCH_SIZE);
      const batchRequests = slice.map((id, idx) => ({
        id: String(idx + 1),
        method: 'POST',
        url: `/me/messages/${id}/move`,
        headers: { 'Content-Type': 'application/json' },
        body: { destinationId: 'deleteditems' },
      }));

      const res = await fetch('https://graph.microsoft.com/v1.0/$batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: batchRequests }),
      });

      if (!res.ok) {
        throw new Error(`Microsoft batch move failed (${res.status})`);
      }
    }

    return { success: true, count: messageIds.length };
  }

  async getAccountInfo() {
    return {
      email: 'Microsoft Outlook Account',
      name: 'Outlook / Office 365 User',
      provider: 'microsoft' as const,
    };
  }
}
