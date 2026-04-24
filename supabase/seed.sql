-- Seed data for local dev. Creates three auth users plus matching profiles.
-- Passwords are test-only; change before any real deployment.
--
-- Provider       : ryan@example.test   / LogDumpster!Provider1
-- Proxy          : tara@example.test   / LogDumpster!Proxy1
-- Secondary Proxy: patrick@example.test/ LogDumpster!Proxy2

do $$
declare
  v_provider uuid := gen_random_uuid();
  v_proxy    uuid := gen_random_uuid();
  v_proxy2   uuid := gen_random_uuid();
begin
  -- Provider
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_super_admin)
  values (v_provider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'ryan@example.test',
          crypt('LogDumpster!Provider1', gen_salt('bf')),
          now(), now(), now(),
          '{"provider":"email"}'::jsonb, '{}'::jsonb, false);

  insert into profiles (id, role, display_name, email, phone_e164)
  values (v_provider, 'provider', 'Ryan Griffiths', 'ryan@example.test', null);

  -- Proxy
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_super_admin)
  values (v_proxy, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'tara@example.test',
          crypt('LogDumpster!Proxy1', gen_salt('bf')),
          now(), now(), now(),
          '{"provider":"email"}'::jsonb, '{}'::jsonb, false);

  insert into profiles (id, role, display_name, email, phone_e164)
  values (v_proxy, 'proxy', 'Tara Sellers', 'tara@example.test', null);

  -- Secondary Proxy
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_super_admin)
  values (v_proxy2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'patrick@example.test',
          crypt('LogDumpster!Proxy2', gen_salt('bf')),
          now(), now(), now(),
          '{"provider":"email"}'::jsonb, '{}'::jsonb, false);

  insert into profiles (id, role, display_name, email, phone_e164)
  values (v_proxy2, 'secondary_proxy', 'Patrick', 'patrick@example.test', null);

  -- One example submitted claim with receipt missing (so grace period kicks in).
  insert into claims (submitter_id, vendor, purchase_date, amount_cents,
                      classification, agreement_section, notes)
  values (v_proxy, 'CVS Pharmacy', current_date, 4523,
          'essential', 'Section 3.a - medical supplies',
          'Prescription refill, receipt pending.');
end $$;
