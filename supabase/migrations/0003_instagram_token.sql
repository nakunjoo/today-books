-- Instagram 장기 액세스 토큰을 DB에 저장 (자동 갱신 크론용, 단일 행)
create table if not exists instagram_token (
  id           int primary key default 1,
  access_token text not null,
  updated_at   timestamptz not null default now(),
  constraint instagram_token_single_row check (id = 1)
);
