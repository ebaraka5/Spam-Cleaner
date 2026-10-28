import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';
import { ImapFlow } from 'imapflow';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractDomain, categorizeDomain } from './src/utils/domainParser.ts';
import type { DomainGroup, BatchScanResult } from './src/types/provider.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// DEMO IN-MEMORY SIMULATION DATA STORE
// ==========================================
interface DemoEmail {
  id: string;
  sender: string;
  subject: string;
  date: string;
  domain: string;
  sizeKb: number;
}

const DEMO_DOMAINS_SEED: Array<{
  domain: string;
  senderName: string;
  emailPrefixes: string[];
  sampleSubjects: string[];
  category: 'newsletters' | 'promotions' | 'social' | 'notifications' | 'receipts' | 'finance' | 'other';
  isSafeSender: boolean;
  frequencyWeight: number; // relative prevalence in inbox
}> = [
  {
    domain: 'substack.com',
    senderName: 'Substack Daily',
    emailPrefixes: ['newsletter', 'editorial', 'digest', 'author'],
    sampleSubjects: ['Your Wednesday Longform Read', 'Deep Dive: Technology Trends 2026', 'Weekly Writer Showcase', 'Top Stories You Might Have Missed'],
    category: 'newsletters',
    isSafeSender: false,
    frequencyWeight: 180,
  },
  {
    domain: 'linkedin.com',
    senderName: 'LinkedIn Notifications',
    emailPrefixes: ['notifications', 'invitations', 'updates', 'jobs'],
    sampleSubjects: ['You appeared in 14 searches this week', 'Congratulate Sarah on 3 years at Acme Corp', 'New Job Recommendations for Senior Engineer', 'Someone viewed your profile'],
    category: 'social',
    isSafeSender: false,
    frequencyWeight: 240,
  },
  {
    domain: 'marketing.target.com',
    senderName: 'Target Weekly Ad',
    emailPrefixes: ['deals', 'weeklyad', 'offers', 'savings'],
    sampleSubjects: ['20% off Home & Tech essentials this weekend', 'Flash Sale: RedCard exclusive savings', 'Items in your cart are now on sale', 'BOGO 50% off select brands'],
    category: 'promotions',
    isSafeSender: false,
    frequencyWeight: 140,
  },
  {
    domain: 'e.amazon.com',
    senderName: 'Amazon Deals & Recommendations',
    emailPrefixes: ['deals', 'order-update', 'recommendations', 'kindle'],
    sampleSubjects: ['Deal of the Day: Electronics blowout', 'Based on your recent browsing history', 'Lightning Deal starts in 15 minutes', 'Save an extra $15 on essentials'],
    category: 'promotions',
    isSafeSender: false,
    frequencyWeight: 220,
  },
  {
    domain: 'medium.com',
    senderName: 'Medium Daily Digest',
    emailPrefixes: ['digest', 'recommendations', 'editorial'],
    sampleSubjects: ['10 Architecture Patterns Every Developer Should Know', 'The quiet revolution in distributed databases', 'My journey from junior to staff engineer', 'Frontend State Management in 2026'],
    category: 'newsletters',
    isSafeSender: false,
    frequencyWeight: 95,
  },
  {
    domain: 'notifications.github.com',
    senderName: 'GitHub Alerts',
    emailPrefixes: ['notifications', 'support', 'security'],
    sampleSubjects: ['[Repo] Pull request #142 merged into main', 'Security advisory: bump dependency version', 'Workflow run passed for production deploy', 'Issue assigned to you: #309'],
    category: 'notifications',
    isSafeSender: false,
    frequencyWeight: 160,
  },
  {
    domain: 'twitter.com',
    senderName: 'X / Twitter',
    emailPrefixes: ['notify', 'digest', 'info'],
    sampleSubjects: ['Top trending topics in Engineering', 'Popular posts from accounts you follow', 'Direct message waiting from Alex', 'Weekly recap of your mentions'],
    category: 'social',
    isSafeSender: false,
    frequencyWeight: 110,
  },
  {
    domain: 'mailer.uber.com',
    senderName: 'Uber & Uber Eats',
    emailPrefixes: ['receipts', 'promotions', 'offers'],
    sampleSubjects: ['Your receipt for Tuesday afternoon trip', '40% off your next 3 dinner deliveries', 'Your ride with David', 'Dinner is served: popular near you'],
    category: 'receipts',
    isSafeSender: true,
    frequencyWeight: 80,
  },
  {
    domain: 'alerts.chase.com',
    senderName: 'Chase Bank Alerts',
    emailPrefixes: ['alerts', 'statements', 'fraud-protection'],
    sampleSubjects: ['Your monthly account statement is available', 'Transaction alert: $42.50 at Grocery', 'Payment scheduled confirmation', 'Security notice: New sign-in detected'],
    category: 'finance',
    isSafeSender: true,
    frequencyWeight: 45,
  },
  {
    domain: 'promotions.walmart.com',
    senderName: 'Walmart Special Buys',
    emailPrefixes: ['promotions', 'savings', 'weekly'],
    sampleSubjects: ['Rollback alerts: Prices slashed across grocery & tech', 'Free next-day shipping unlocked on order', 'Don’t forget these items in your cart', 'Weekend BBQ specials'],
    category: 'promotions',
    isSafeSender: false,
    frequencyWeight: 130,
  },
  {
    domain: 'newsletter.beehiiv.com',
    senderName: 'Beehiiv Tech Pulse',
    emailPrefixes: ['pulse', 'weekly', 'trends'],
    sampleSubjects: ['AI Hardware Benchmarks for 2026', 'Funding rounds of the week', 'The rise of edge compute agents', 'Founder Interview #88'],
    category: 'newsletters',
    isSafeSender: false,
    frequencyWeight: 75,
  },
  {
    domain: 'updates.slack.com',
    senderName: 'Slack Notifications',
    emailPrefixes: ['notification', 'feedback', 'enterprise'],
    sampleSubjects: ['New message in #product-release', 'You were mentioned in #dev-announcements', 'Weekly digest of workspace highlights', 'New app integration approved'],
    category: 'notifications',
    isSafeSender: false,
    frequencyWeight: 90,
  },
  {
    domain: 'news.morningbrew.com',
    senderName: 'Morning Brew',
    emailPrefixes: ['crew', 'business', 'tech'],
    sampleSubjects: ['Markets react to interest rate signals', 'The chip race gets hotter', 'Why every retail chain is launching a subscription', 'Coffee break trivia challenge'],
    category: 'newsletters',
    isSafeSender: false,
    frequencyWeight: 85,
  },
  {
    domain: 'deals.bestbuy.com',
    senderName: 'Best Buy Top Deals',
    emailPrefixes: ['deals', 'member', 'special'],
    sampleSubjects: ['Member 24-Hour Flash Sale', 'Save up to $400 on 4K OLED screens', 'Upgrade your workstation before Sunday', 'Totaltech Member Price drop'],
    category: 'promotions',
    isSafeSender: false,
    frequencyWeight: 70,
  },
  {
    domain: 'no-reply.stripe.com',
    senderName: 'Stripe Billing & Receipts',
    emailPrefixes: ['receipts', 'notifications', 'invoices'],
    sampleSubjects: ['Your invoice from SaaS Inc. #INV-9921', 'Monthly payment receipt confirmation', 'Payout of $1,420.00 is on its way', 'Upcoming invoice notice'],
    category: 'receipts',
    isSafeSender: true,
    frequencyWeight: 35,
  },
  {
    domain: 'zoom.us',
    senderName: 'Zoom Cloud Meetings',
    emailPrefixes: ['no-reply', 'calendar', 'cloud-recordings'],
    sampleSubjects: ['Cloud Recording - Sprint Planning is now available', 'Invitation: Product Review @ 2:00 PM', 'Audio transcript ready for viewing', 'Webinar reminder: begins in 1 hour'],
    category: 'notifications',
    isSafeSender: false,
    frequencyWeight: 60,
  },
  {
    domain: 'pinterest.com',
    senderName: 'Pinterest Inspiration',
    emailPrefixes: ['ideas', 'pins', 'explore'],
    sampleSubjects: ['15 Home Office setups you might love', 'Trending recipe ideas for dinner', 'Boards inspired by your recent saves', 'New pins added to Modern Architecture'],
    category: 'social',
    isSafeSender: false,
    frequencyWeight: 105,
  },
  {
    domain: 'promotions.ebay.com',
    senderName: 'eBay Daily Deals',
    emailPrefixes: ['deals', 'watchlist', 'offers'],
    sampleSubjects: ['Price drop on an item in your Watchlist', '20% coupon code on refurbished electronics', 'Last chance to bid on Vintage Camera', 'Top picks curated for your hobbies'],
    category: 'promotions',
    isSafeSender: false,
    frequencyWeight: 115,
  },
  {
    domain: 'notion.so',
    senderName: 'Notion Workspace',
    emailPrefixes: ['team', 'updates', 'digest'],
    sampleSubjects: ['Alex commented on "Q4 Strategy Doc"', 'Weekly activity update for Acme Team', 'Page edited: Roadmap 2026', 'New template released in Gallery'],
    category: 'notifications',
    isSafeSender: false,
    frequencyWeight: 50,
  },
  {
    domain: 'receipts.apple.com',
    senderName: 'Apple Invoices',
    emailPrefixes: ['no_reply', 'invoices'],
    sampleSubjects: ['Your invoice from Apple for iCloud+ storage', 'App Store subscription renewal receipt', 'Receipt for Apple Music Family Plan', 'Order confirmation #W829410'],
    category: 'receipts',
    isSafeSender: true,
    frequencyWeight: 40,
  },
  {
    domain: 'info.quora.com',
    senderName: 'Quora Digest',
    emailPrefixes: ['digest', 'answers', 'trending'],
    sampleSubjects: ['What are the hardest habits to break in programming?', 'Top answers to questions you follow', 'Why did aircraft design stop advancing speed?', 'Can humans ever colonize Titan?'],
    category: 'social',
    isSafeSender: false,
    frequencyWeight: 95,
  },
  {
    domain: 'service.paypal.com',
    senderName: 'PayPal Security & Activity',
    emailPrefixes: ['service', 'notify', 'security'],
    sampleSubjects: ['You sent $28.00 USD to Coffee Roasters', 'Receipt for your payment to Digital Services', 'Security update: 2-step verification', 'Monthly account summary statement'],
    category: 'finance',
    isSafeSender: true,
    frequencyWeight: 30,
  },
];

function generateDemoInbox(totalCount: number = 2500): DemoEmail[] {
  const emails: DemoEmail[] = [];
  const baseTime = Date.now();
  let idCounter = 10001;

  // Distribute based on frequency weights
  const totalWeight = DEMO_DOMAINS_SEED.reduce((acc, cur) => acc + cur.frequencyWeight, 0);

  DEMO_DOMAINS_SEED.forEach((seed) => {
    const countForSeed = Math.round((seed.frequencyWeight / totalWeight) * totalCount);
    for (let i = 0; i < countForSeed; i++) {
      const prefix = seed.emailPrefixes[i % seed.emailPrefixes.length];
      const subject = seed.sampleSubjects[i % seed.sampleSubjects.length];
      // Random past timestamp within last 6 months
      const randomOffset = Math.floor(Math.random() * (180 * 24 * 3600 * 1000));
      const emailDate = new Date(baseTime - randomOffset).toISOString();
      const senderString = `${seed.senderName} <${prefix}@${seed.domain}>`;
      const sizeKb = Math.floor(Math.random() * 85) + 12;

      emails.push({
        id: `demo_msg_${idCounter++}`,
        sender: senderString,
        subject,
        date: emailDate,
        domain: seed.domain,
        sizeKb,
      });
    }
  });

  // Sort descending by date
  return emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

let activeDemoInbox: DemoEmail[] = generateDemoInbox(2500);

// ==========================================
// API ROUTES
// ==========================================

/**
 * Reset Demo Data
 */
app.post('/api/demo/reset', (_req: Request, res: Response) => {
  activeDemoInbox = generateDemoInbox(2500);
  res.json({ success: true, count: activeDemoInbox.length });
});

/**
 * Demo Scan Batch (500 emails per batch)
 */
app.post('/api/demo/scan', (req: Request, res: Response) => {
  const cursor = (req.body.cursor as string) || '0';
  const startIndex = parseInt(cursor, 10) || 0;
  const batchSize = 500;
  const endIndex = Math.min(startIndex + batchSize, activeDemoInbox.length);
  const currentBatch = activeDemoInbox.slice(startIndex, endIndex);

  const domains: Record<string, DomainGroup> = {};

  for (const email of currentBatch) {
    const { domain, email: parsedEmail } = extractDomain(email.sender);
    const catInfo = categorizeDomain(domain);

    if (!domains[domain]) {
      domains[domain] = {
        count: 0,
        messageIds: [],
        sampleSubjects: [],
        sampleSenders: [],
        lastDate: email.date,
        category: catInfo.category,
        isSafeSender: catInfo.isSafeSender,
        estimatedSizeKb: 0,
      };
    }

    const group = domains[domain];
    group.count += 1;
    group.messageIds.push(email.id);
    (group.estimatedSizeKb as number) += email.sizeKb;

    if (group.sampleSubjects && group.sampleSubjects.length < 5 && !group.sampleSubjects.includes(email.subject)) {
      group.sampleSubjects.push(email.subject);
    }
    if (group.sampleSenders && group.sampleSenders.length < 3 && !group.sampleSenders.includes(parsedEmail)) {
      group.sampleSenders.push(parsedEmail);
    }
    if (new Date(email.date).getTime() > new Date(group.lastDate || 0).getTime()) {
      group.lastDate = email.date;
    }
  }

  const nextCursor = endIndex < activeDemoInbox.length ? String(endIndex) : null;
  const batchNumber = Math.floor(startIndex / batchSize) + 1;

  const result: BatchScanResult = {
    domains,
    nextCursor,
    totalScanned: currentBatch.length,
    batchNumber,
  };

  res.json(result);
});

/**
 * Demo Delete Batch
 */
app.post('/api/demo/delete', (req: Request, res: Response) => {
  const messageIds = (req.body.messageIds as string[]) || [];
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No message IDs specified for deletion' });
  }

  const idSet = new Set(messageIds);
  const beforeCount = activeDemoInbox.length;
  activeDemoInbox = activeDemoInbox.filter((msg) => !idSet.has(msg.id));
  const deletedCount = beforeCount - activeDemoInbox.length;

  res.json({ success: true, count: deletedCount });
});

/**
 * GMAIL: Scan Batch using googleapis
 */
app.post('/api/gmail/scan', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing Gmail authorization Bearer token' });
  }

  const cursor = (req.body.cursor as string) || undefined;
  const batchLimit = 500;

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // List up to 500 messages from INBOX
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: batchLimit,
      pageToken: cursor,
      q: 'in:inbox',
    });

    const messages = listResponse.data.messages || [];
    const nextPageToken = listResponse.data.nextPageToken || null;

    if (messages.length === 0) {
      return res.json({
        domains: {},
        nextCursor: null,
        totalScanned: 0,
      });
    }

    const domains: Record<string, DomainGroup> = {};

    // Fetch metadata for messages in parallel batches to extract From header
    const CHUNK_SIZE = 40;
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const slice = messages.slice(i, i + CHUNK_SIZE);
      const details = await Promise.all(
        slice.map(async (msg) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id!,
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            });
            return detail.data;
          } catch {
            return null;
          }
        })
      );

      for (const item of details) {
        if (!item || !item.id) continue;
        const headers = item.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();

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

    const result: BatchScanResult = {
      domains,
      nextCursor: nextPageToken,
      totalScanned: messages.length,
    };

    res.json(result);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Gmail scan error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to scan Gmail inbox' });
  }
});

/**
 * GMAIL: Delete / Trash Batch using googleapis
 */
app.post('/api/gmail/delete', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing Gmail authorization Bearer token' });
  }

  const messageIds = (req.body.messageIds as string[]) || [];
  const permanent = req.body.permanent === true;

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: 'No message IDs specified' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (permanent) {
      // Permanent bulk delete in chunks of 1000
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < messageIds.length; i += CHUNK_SIZE) {
        const chunk = messageIds.slice(i, i + CHUNK_SIZE);
        await gmail.users.messages.batchDelete({
          userId: 'me',
          requestBody: { ids: chunk },
        });
      }
    } else {
      // Move to Trash (remove INBOX, add TRASH)
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < messageIds.length; i += CHUNK_SIZE) {
        const chunk = messageIds.slice(i, i + CHUNK_SIZE);
        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: chunk,
            removeLabelIds: ['INBOX'],
            addLabelIds: ['TRASH'],
          },
        });
      }
    }

    res.json({ success: true, count: messageIds.length });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Gmail delete error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to delete Gmail messages' });
  }
});

/**
 * MICROSOFT GRAPH: Scan Batch
 */
app.post('/api/graph/scan', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing Microsoft Graph access token' });
  }

  const cursor = req.body.cursor as string | undefined;

  try {
    const graphClient = GraphClient.init({
      authProvider: (done) => done(null, token),
    });

    let reqBuilder;
    if (cursor && cursor.startsWith('http')) {
      // Use full @odata.nextLink URL
      reqBuilder = graphClient.api(cursor);
    } else {
      reqBuilder = graphClient
        .api('/me/mailFolders/inbox/messages')
        .top(500)
        .select('id,from,subject,receivedDateTime,isRead');
    }

    const response = await reqBuilder.get();
    const messages = response.value || [];
    const nextLink = response['@odata.nextLink'] || null;

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

    res.json({
      domains,
      nextCursor: nextLink,
      totalScanned: messages.length,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Microsoft Graph scan error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to scan Microsoft mailbox' });
  }
});

/**
 * MICROSOFT GRAPH: Delete Batch
 */
app.post('/api/graph/delete', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing Microsoft Graph access token' });
  }

  const messageIds = (req.body.messageIds as string[]) || [];
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: 'No message IDs specified' });
  }

  try {
    const graphClient = GraphClient.init({
      authProvider: (done) => done(null, token),
    });

    // Microsoft Graph batch API accepts up to 20 requests per batch call
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

      await graphClient.api('/$batch').post({ requests: batchRequests });
    }

    res.json({ success: true, count: messageIds.length });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Graph delete error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to delete Microsoft messages' });
  }
});

/**
 * YAHOO / IMAP: Scan Batch using imapflow
 */
app.post('/api/imap/scan', async (req: Request, res: Response) => {
  const { user, pass, host = 'imap.mail.yahoo.com', port = 993, cursor } = req.body;

  if (!user || !pass) {
    return res.status(400).json({ error: 'Missing Yahoo/IMAP username or App Password' });
  }

  const client = new ImapFlow({
    host,
    port: Number(port),
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const status = await client.status('INBOX', { messages: true });
      const totalMessages = (status && typeof status === 'object' && 'messages' in status && typeof status.messages === 'number')
        ? status.messages
        : 0;

      if (totalMessages === 0) {
        return res.json({ domains: {}, nextCursor: null, totalScanned: 0 });
      }

      // Cursor is the sequence range offset. We read batches of 500 from newest to oldest
      // e.g. cursor = "2000" means start at sequence 2000 down to 1501
      let endSeq = cursor ? parseInt(cursor, 10) : totalMessages;
      if (endSeq <= 0) {
        return res.json({ domains: {}, nextCursor: null, totalScanned: 0 });
      }

      const startSeq = Math.max(1, endSeq - 499);
      const seqRange = `${startSeq}:${endSeq}`;

      const domains: Record<string, DomainGroup> = {};
      let scannedCount = 0;

      for await (const message of client.fetch(seqRange, { envelope: true, uid: true, size: true })) {
        scannedCount++;
        const fromEnvelope = message.envelope?.from?.[0];
        const fromAddr = fromEnvelope?.address || 'unknown@sender.com';
        const fromName = fromEnvelope?.name || '';
        const fromStr = fromName ? `${fromName} <${fromAddr}>` : fromAddr;

        const { domain, email } = extractDomain(fromStr);
        const catInfo = categorizeDomain(domain);
        const subject = message.envelope?.subject || '(No Subject)';
        const dateVal = message.envelope?.date;
        const dateStr = dateVal instanceof Date ? dateVal.toISOString() : typeof dateVal === 'string' ? dateVal : new Date().toISOString();

        if (!domains[domain]) {
          domains[domain] = {
            count: 0,
            messageIds: [],
            sampleSubjects: [],
            sampleSenders: [],
            lastDate: dateStr,
            category: catInfo.category,
            isSafeSender: catInfo.isSafeSender,
            estimatedSizeKb: message.size ? Math.round(message.size / 1024) : 30,
          };
        }

        const group = domains[domain];
        group.count += 1;
        group.messageIds.push(String(message.uid));

        if (group.sampleSubjects && group.sampleSubjects.length < 5 && !group.sampleSubjects.includes(subject)) {
          group.sampleSubjects.push(subject);
        }
        if (group.sampleSenders && group.sampleSenders.length < 3 && !group.sampleSenders.includes(email)) {
          group.sampleSenders.push(email);
        }
      }

      const nextCursor = startSeq > 1 ? String(startSeq - 1) : null;

      res.json({
        domains,
        nextCursor,
        totalScanned: scannedCount,
      });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Yahoo IMAP scan error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to connect or scan via IMAP' });
  }
});

/**
 * YAHOO / IMAP: Delete Batch using imapflow
 */
app.post('/api/imap/delete', async (req: Request, res: Response) => {
  const { user, pass, host = 'imap.mail.yahoo.com', port = 993, messageIds } = req.body;

  if (!user || !pass) {
    return res.status(400).json({ error: 'Missing Yahoo/IMAP username or App Password' });
  }

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: 'No message UIDs provided' });
  }

  const client = new ImapFlow({
    host,
    port: Number(port),
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Try moving to Trash or marking \Deleted
      const uids = messageIds.map((id) => Number(id)).filter((id) => !isNaN(id));

      try {
        await client.messageMove(uids, 'Trash', { uid: true });
      } catch {
        // Fallback: flag as deleted
        await client.messageFlagsAdd(uids, ['\\Deleted'], { uid: true });
      }

      res.json({ success: true, count: uids.length });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Yahoo IMAP delete error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to delete messages via IMAP' });
  }
});

// ==========================================
// VITE OR STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Email Cleaner full-stack server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
