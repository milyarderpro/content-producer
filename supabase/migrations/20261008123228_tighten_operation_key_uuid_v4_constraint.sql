-- Phase 3 corrective migration: require a canonical RFC UUID v4 operation key.

alter table internal.operation_ledger
  drop constraint operation_ledger_operation_key_v4_check;

alter table internal.operation_ledger
  add constraint operation_ledger_operation_key_rfc_uuid_v4_check
  check (
    operation_key::text ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );
