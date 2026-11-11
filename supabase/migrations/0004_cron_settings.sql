-- 크론 on/off 스위치 (배포 없이 DB 값만 바꿔서 크론을 멈추거나 재개)
create table if not exists cron_settings (
  name       text primary key,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

-- daily-book: 알라딘 API 종료로 정보나루/네이버 교체 중이라 꺼둔 상태로 시작
insert into cron_settings (name, enabled) values ('daily-book', false)
on conflict (name) do nothing;
