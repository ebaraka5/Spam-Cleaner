import type { EmailProviderAdapter, BatchScanResult, DomainGroup } from '../../types/provider.ts';
import { extractDomain, categorizeDomain } from '../../utils/domainParser.ts';

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
  frequencyWeight: number;
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

function generateClientDemoInbox(totalCount: number = 2500): DemoEmail[] {
  const emails: DemoEmail[] = [];
  const baseTime = Date.now();
  let idCounter = 10001;

  const totalWeight = DEMO_DOMAINS_SEED.reduce((acc, cur) => acc + cur.frequencyWeight, 0);

  DEMO_DOMAINS_SEED.forEach((seed) => {
    const countForSeed = Math.round((seed.frequencyWeight / totalWeight) * totalCount);
    for (let i = 0; i < countForSeed; i++) {
      const prefix = seed.emailPrefixes[i % seed.emailPrefixes.length];
      const subject = seed.sampleSubjects[i % seed.sampleSubjects.length];
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

  return emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Global in-memory demo inbox on client
let clientDemoStore: DemoEmail[] = generateClientDemoInbox(2500);

export class DemoAdapter implements EmailProviderAdapter {
  async scanBatch(cursor?: string): Promise<BatchScanResult> {
    // Client-side execution (guaranteed to work on Netlify, localhost, anywhere without a backend)
    const startIndex = cursor ? parseInt(cursor, 10) || 0 : 0;
    const batchSize = 500;
    const endIndex = Math.min(startIndex + batchSize, clientDemoStore.length);
    const currentBatch = clientDemoStore.slice(startIndex, endIndex);

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
      group.estimatedSizeKb = (group.estimatedSizeKb || 0) + email.sizeKb;

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

    const nextCursor = endIndex < clientDemoStore.length ? String(endIndex) : null;
    const batchNumber = Math.floor(startIndex / batchSize) + 1;

    return {
      domains,
      nextCursor,
      totalScanned: currentBatch.length,
      batchNumber,
    };
  }

  async deleteBatch(messageIds: string[], _permanent: boolean = false): Promise<{ success: boolean; count: number }> {
    const idSet = new Set(messageIds);
    const beforeCount = clientDemoStore.length;
    clientDemoStore = clientDemoStore.filter((msg) => !idSet.has(msg.id));
    const deletedCount = beforeCount - clientDemoStore.length;

    return { success: true, count: deletedCount };
  }

  async resetDemo(): Promise<void> {
    clientDemoStore = generateClientDemoInbox(2500);
  }

  async getAccountInfo() {
    return {
      email: 'alex.demo.user@example.com',
      name: 'Alex Vance (Sample Inbox)',
      provider: 'demo' as const,
    };
  }
}
