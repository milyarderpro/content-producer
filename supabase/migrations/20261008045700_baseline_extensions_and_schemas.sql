-- Phase 2 local baseline: no business tables or RPCs are created here.
-- `public` is platform-included, but its future business objects receive no
-- Data API privileges until a later migration grants a specific RPC surface.

create schema if not exists api;
create schema if not exists internal;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- `api` is the only caller-facing business RPC schema. There are no RPCs yet;
-- Phase 5 grants EXECUTE only to the reviewed allowlist.
revoke all on schema api from public, anon, service_role;
grant usage on schema api to authenticated;

-- `internal` is not a Data API schema and never receives caller privileges.
revoke all on schema internal from public, anon, authenticated, service_role;

-- Do not rely on the platform's evolving defaults for future business objects.
-- Phase 3 and later must grant every required privilege explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema internal
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema internal
  revoke all on sequences from anon, authenticated, service_role;

-- Per-schema defaults cannot remove PostgreSQL's global PUBLIC EXECUTE
-- default. Revoke that global default, then remove role-specific defaults from
-- Content Producer schemas. Future RPCs must receive explicit EXECUTE grants.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema internal
  revoke execute on functions from anon, authenticated, service_role;
