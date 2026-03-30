-- Migration: rename and document the bot_usage_log RLS policy
--
-- The original policy name "service role insert only" was misleading:
-- it applied to ALL operations (for all), not just inserts.
-- Renamed to "deny all jwt access" for clarity.
--
-- Why using(false) / with check(false) is correct here:
-- This table is accessed EXCLUSIVELY via the service role key, which bypasses
-- RLS entirely. The policy below denies all JWT-based access as defense in depth.
-- Never expose this table to the anon or authenticated roles directly.

drop policy if exists "service role insert only" on public.bot_usage_log;

create policy "deny all jwt access"
  on public.bot_usage_log
  for all
  using (false)
  with check (false);
