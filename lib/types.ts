export type ArticleStatus = "draft" | "published" | "scheduled";

export interface MediaRef {
  url: string;
  alt?: string;
  caption?: string;
  credit?: string;
}

export interface VideoRef {
  url: string;
  title?: string;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  body: string; // markdown
  cover?: MediaRef;
  gallery: MediaRef[];
  videos: VideoRef[];
  embeds: string[];
  sources: SourceLink[];
  category: string; // category slug
  tags: string[]; // tag slugs
  author: string; // display name
  status: ArticleStatus;
  publishAt: string; // ISO
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  headline: boolean;
  breaking: boolean;
  seo: SeoFields;
  demo?: boolean;
  aiGenerated?: boolean;
}

export type ArticleSummary = Omit<Article, "body" | "gallery" | "videos" | "embeds" | "sources"> & {
  readingTime: number;
  hasProof: boolean;
};

export interface Category {
  slug: string;
  name: string;
  description?: string;
}

export interface Tag {
  slug: string;
  name: string;
}

export interface SiteIndex {
  articles: ArticleSummary[];
  categories: Category[];
  tags: Tag[];
  trendsDone?: string[];
  seeded?: boolean;
}

export type AiProvider = "openai" | "gemini" | "groq" | "openrouter" | "custom";

export interface AiSettings {
  provider: AiProvider;
  model: string;
  baseUrl?: string;
  tokenEnc?: string;
  lastGoodModel?: string;
  autoPublish: boolean;
  autoGenerate: boolean;
  autoCount: number;
}

export type MediaProviderType = "brave" | "serper" | "youtube" | "pexels" | "unsplash" | "pixabay";

export interface MediaProvider {
  id: string;
  type: MediaProviderType;
  name: string;
  enabled: boolean;
  tokenEnc?: string;
}

export interface MediaSettings {
  autoAfterAi: boolean;
  coverMode: "source" | "stock" | "off";
  platforms: { youtube: boolean; tiktok: boolean; instagram: boolean; x: boolean; facebook: boolean };
  maxVideos: number;
  maxSocial: number;
  maxRefs: number;
  extraKeywords: string;
  blockedDomains: string;
  providers: MediaProvider[];
}

export interface Settings {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  faviconUrl?: string;
  social: { facebook?: string; instagram?: string; x?: string; youtube?: string; tiktok?: string; telegram?: string };
  tickerText?: string;
  gaId?: string;
  adsenseClient?: string;
  contactEmail?: string;
  ai: AiSettings;
  media: MediaSettings;
  fontStyle?: "modern" | "klasik" | "sistem";
  adminPasswordHashEnc?: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  createdAt: string;
}
