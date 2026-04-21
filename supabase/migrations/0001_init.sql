-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ─── books ──────────────────────────────────────────────────
create table if not exists books (
  id              uuid primary key default uuid_generate_v4(),
  isbn13          text unique,
  title           text not null,
  author          text,
  publisher       text,
  published_date  date,
  cover_url       text,
  description     text,
  toc             text,
  categories      text[] default '{}',
  keywords        text[] default '{}',
  mood            text[] default '{}',
  difficulty      text,
  reading_time    int,
  embedding       vector(768),
  blocked         boolean default false,
  blocked_reason  text,
  used_at         timestamptz,
  created_at      timestamptz default now()
);

create index if not exists books_used_at_idx on books (used_at);
create index if not exists books_blocked_idx on books (blocked);
create index if not exists books_embedding_idx on books
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── drafts ─────────────────────────────────────────────────
-- status: pending_review | approved | published | rejected | failed | auto_rejected
create table if not exists drafts (
  id                 uuid primary key default uuid_generate_v4(),
  book_id            uuid references books(id) on delete cascade,
  status             text not null default 'pending_review',
  theme              text,
  selection_reason   text,
  hook               text,
  content            jsonb,
  caption            text,
  hashtags           text[] default '{}',
  image_urls         text[] default '{}',
  validation         jsonb,
  instagram_post_id  text,
  published_at       timestamptz,
  error_message      text,
  created_at         timestamptz default now()
);

create index if not exists drafts_status_idx on drafts (status);
create index if not exists drafts_created_at_idx on drafts (created_at desc);

-- ─── posts (published history) ──────────────────────────────
-- drafts와 분리하지 않고 drafts.status='published'로 운영해도 되지만,
-- 삭제·감사 기록을 위해 소프트 삭제 컬럼만 미리 준비.
alter table drafts
  add column if not exists deleted_at       timestamptz,
  add column if not exists deleted_by       text,
  add column if not exists deleted_reason   text;
