-- books 테이블 제거, 책 정보를 drafts에 인라인으로
alter table drafts
  drop column if exists book_id,
  add column if not exists isbn13      text,
  add column if not exists title       text,
  add column if not exists author      text,
  add column if not exists publisher   text,
  add column if not exists cover_url   text,
  add column if not exists description text,
  add column if not exists toc         text;

drop table if exists books cascade;
