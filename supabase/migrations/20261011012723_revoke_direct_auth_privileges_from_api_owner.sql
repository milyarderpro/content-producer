-- CR-009 remediation: migration 20261010150936 attempted to grant the narrow
-- API-owner role direct access to auth.uid(). That path is rejected by CR-009:
-- the role may obtain the caller identity only through the tightly scoped
-- internal.current_auth_uid_v1() bridge. Revoke any role-specific ACLs here;
-- this is intentionally additive so existing migration history remains intact.

revoke usage on schema auth from content_producer_api_owner;
revoke execute on function auth.uid() from content_producer_api_owner;
