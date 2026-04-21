export type Book = {
  id: string;
  isbn13: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedDate: string | null;
  coverUrl: string | null;
  description: string | null;
  toc: string | null;
  categories: string[];
  keywords: string[];
  mood: string[];
  difficulty: string | null;
  readingTime: number | null;
  blocked: boolean;
  usedAt: string | null;
};

export type DraftStatus =
  | "pending_review"
  | "approved"
  | "published"
  | "rejected"
  | "failed"
  | "auto_rejected";

export type CardContent = {
  cover: { hook: string; theme: string };
  targetReader: { title: string; items: [string, string, string] };
  keyMessages: Array<{ title: string; description: string }>;
  quote: { text: string; context: string };
  closing: { oneLiner: string; readingTime: string };
  caption: string;
  hashtags: string[];
};
