-- auth.uid() is the sole identity source for the invoker-owned API role.
-- Schema USAGE and this one function are the smallest privileges required to
-- resolve it; they grant neither access to Auth tables nor any other helper.
grant usage on schema auth to content_producer_api_owner;
grant execute on function auth.uid() to content_producer_api_owner;
