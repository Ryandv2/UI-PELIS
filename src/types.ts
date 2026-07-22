export interface ExtractedEmbed {
  src: string;
  label: string;
  domain: string;
  type: 'iframe' | 'script-match' | 'direct';
}

export interface ScrapeResult {
  id: string;
  targetUrl: string;
  title: string;
  date: string;
  embeds: ExtractedEmbed[];
}

export interface UsageStats {
  count: number;
  limit: number;
  lastReset: string;
  isUnlimited: boolean;
  expiresAt?: string;
  extraCredits: number;
  email?: string;
  displayName?: string;
  hasExhaustedInitial?: boolean;
  updatedAt?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  coverURL?: string;
  createdAtDate?: string;
  twitter?: string;
  website?: string;
}

export interface PaymentInvoice {
  id: string;
  amount: number;
  planName: string;
  date: string;
  status: 'pending' | 'success';
}
