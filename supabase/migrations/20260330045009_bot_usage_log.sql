-- Migration: bot_usage_log
-- Records each monitoring bot run with outcome, token usage, and optional PR link.

create table if not exists public.bot_usage_log (
  id              bigserial primary key,
  firm_slug       text not null,
  run_at          timestamptz not null default now(),
  last_verified   date,
  changes_detected boolean not null,
  pr_url          text,
  tokens_used     integer,
  cost_usd        numeric(10, 6),
  error           text
);

-- Only the service role key may insert rows.
alter table public.bot_usage_log enable row level security;

create policy "service role insert only"
  on public.bot_usage_log
  for all
  using (false)
  with check (false);
