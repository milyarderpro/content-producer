-- Read-only, deterministic catalog fingerprints. Never include business rows,
-- role OIDs, sequence positions, runtime timestamps or PostgreSQL patch versions.
with functions as (
  select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('api','internal')
), objects as (
  select c.*,n.nspname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','internal') and c.relkind in ('r','S')
)
select jsonb_build_object(
  'functions',(select jsonb_agg(jsonb_build_object(
    'signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
    'definer',p.prosecdef,'settings',p.proconfig,
    'source_sha256',encode(extensions.digest(convert_to(pg_get_functiondef(p.oid),'UTF8'),'sha256'),'hex'),
    'acl',p.proacl::text) order by p.oid::regprocedure::text) from functions p),
  'objects',(select jsonb_agg(jsonb_build_object(
    'object',c.oid::regclass::text,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
    'acl',c.relacl::text,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity)
    order by c.oid::regclass::text) from objects c),
  'columns',(select jsonb_agg(jsonb_build_object(
    'table',c.oid::regclass::text,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
    'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
    'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl::text)
    order by c.oid::regclass::text,a.attnum)
    from objects c join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where c.relkind='r'),
  'constraints',(select jsonb_agg(jsonb_build_object(
    'table',c.oid::regclass::text,'name',x.conname,'definition',pg_get_constraintdef(x.oid),
    'validated',x.convalidated) order by c.oid::regclass::text,x.conname)
    from objects c join pg_constraint x on x.conrelid=c.oid),
  'indexes',(select jsonb_agg(jsonb_build_object(
    'table',c.oid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
    'valid',i.indisvalid,'ready',i.indisready) order by c.oid::regclass::text,pg_get_indexdef(i.indexrelid))
    from objects c join pg_index i on i.indrelid=c.oid),
  'triggers',(select jsonb_agg(jsonb_build_object(
    'table',c.oid::regclass::text,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),
    'enabled',t.tgenabled) order by c.oid::regclass::text,t.tgname)
    from objects c join pg_trigger t on t.tgrelid=c.oid where not t.tgisinternal),
  'policies',(select jsonb_agg(jsonb_build_object(
    'table',c.oid::regclass::text,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
    'roles',(select jsonb_agg(coalesce(r.rolname,'PUBLIC') order by coalesce(r.rolname,'PUBLIC'))
      from unnest(p.polroles) v(role_oid) left join pg_roles r on r.oid=v.role_oid),
    'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))
    order by c.oid::regclass::text,p.polname) from objects c join pg_policy p on p.polrelid=c.oid),
  'schemas',(select jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),
    'acl',nspacl::text) order by nspname) from pg_namespace where nspname in ('api','internal','public')),
  'default_acls',(select jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),
    'schema',coalesce(n.nspname,''),'kind',d.defaclobjtype,'acl',d.defaclacl::text)
    order by pg_get_userbyid(d.defaclrole),coalesce(n.nspname,''),d.defaclobjtype)
    from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
    where d.defaclrole in ('postgres'::regrole,'content_producer_api_owner'::regrole)
    and (d.defaclnamespace=0 or n.nspname in ('api','internal','public')))
);
