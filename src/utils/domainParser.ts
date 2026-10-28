import addressparser from 'addressparser';

/**
 * Extracts a normalized domain from an RFC 2822 sender string.
 * e.g. "Substack Newsletters <daily@updates.substack.com>" -> "substack.com" or "updates.substack.com"
 */
export function extractDomain(senderString: string): { domain: string; email: string; name: string } {
  if (!senderString || typeof senderString !== 'string') {
    return { domain: 'unknown-sender.com', email: 'unknown@sender.com', name: 'Unknown' };
  }

  try {
    const parsed = addressparser(senderString);
    if (parsed && parsed.length > 0 && parsed[0].address) {
      const email = parsed[0].address.toLowerCase().trim();
      const name = parsed[0].name || email.split('@')[0];
      const parts = email.split('@');
      const domain = parts.length > 1 ? parts[1].trim() : 'unknown-sender.com';
      return { domain: domain.toLowerCase(), email, name };
    }
  } catch {
    // fallback regex parser
  }

  // Fallback regex if addressparser fails
  const emailMatch = senderString.match(/<([^>]+)>/) || senderString.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && emailMatch[1]) {
    const email = emailMatch[1].toLowerCase().trim();
    const parts = email.split('@');
    const domain = parts.length > 1 ? parts[1].trim() : 'unknown-sender.com';
    return { domain: domain.toLowerCase(), email, name: senderString.split('<')[0].trim() || domain };
  }

  return { domain: 'unknown-sender.com', email: senderString, name: senderString };
}

/**
 * Categorize a domain based on well-known patterns.
 */
export function categorizeDomain(domain: string): {
  category: 'newsletters' | 'promotions' | 'social' | 'notifications' | 'receipts' | 'finance' | 'other';
  isSafeSender: boolean;
} {
  const d = domain.toLowerCase();

  // Financial & Government / Security critical domains
  const financeDomains = [
    'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com', 'paypal.com',
    'stripe.com', 'irs.gov', 'gov', 'treasury.gov', 'fidelity.com', 'vanguard.com',
    'schwab.com', 'capitalone.com', 'americanexpress.com', 'discover.com', 'coinbase.com'
  ];

  for (const fd of financeDomains) {
    if (d === fd || d.endsWith('.' + fd)) {
      return { category: 'finance', isSafeSender: true };
    }
  }

  // Newsletters
  const newsletterDomains = [
    'substack.com', 'medium.com', 'mailchimp.com', 'beehiiv.com', 'convertkit.com',
    'morningbrew.com', 'nytimes.com', 'wsj.com', 'theverge.com', 'techcrunch.com',
    'axios.com', 'theatlantic.com', 'wired.com', 'substack-custom.com', 'ghost.io'
  ];
  for (const nd of newsletterDomains) {
    if (d === nd || d.endsWith('.' + nd)) {
      return { category: 'newsletters', isSafeSender: false };
    }
  }

  // Social
  const socialDomains = [
    'linkedin.com', 'twitter.com', 'x.com', 'facebookmail.com', 'instagram.com',
    'reddit.com', 'redditmail.com', 'pinterest.com', 'tiktok.com', 'quora.com'
  ];
  for (const sd of socialDomains) {
    if (d === sd || d.endsWith('.' + sd)) {
      return { category: 'social', isSafeSender: false };
    }
  }

  // Promotions & E-Commerce
  const promoDomains = [
    'amazon.com', 'promotions.', 'marketing.', 'e.', 'mailer.', 'target.com',
    'walmart.com', 'bestbuy.com', 'ebay.com', 'shein.com', 'temu.com', 'aliexpress.com',
    'doordash.com', 'ubereats.com', 'instacart.com', 'groupon.com', 'wayfair.com'
  ];
  for (const pd of promoDomains) {
    if (d === pd || d.includes(pd)) {
      return { category: 'promotions', isSafeSender: false };
    }
  }

  // Receipts
  const receiptDomains = [
    'receipts.', 'billing.', 'invoices.', 'uber.com', 'lyft.com', 'apple.com',
    'googleplay.', 'steam.com', 'steampowered.com', 'anthropic.com', 'openai.com'
  ];
  for (const rd of receiptDomains) {
    if (d === rd || d.includes(rd)) {
      return { category: 'receipts', isSafeSender: true };
    }
  }

  // Notifications & Developer tools
  const notificationDomains = [
    'github.com', 'gitlab.com', 'jira.com', 'atlassian.com', 'slack.com',
    'slackmail.com', 'zoom.us', 'notion.so', 'figma.com', 'linear.app',
    'notifications.', 'alerts.', 'noreply.'
  ];
  for (const nd of notificationDomains) {
    if (d === nd || d.includes(nd)) {
      return { category: 'notifications', isSafeSender: false };
    }
  }

  return { category: 'other', isSafeSender: false };
}
