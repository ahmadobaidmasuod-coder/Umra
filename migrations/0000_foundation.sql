CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE membership_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenant_role AS ENUM ('TENANT_ADMIN', 'OPERATOR', 'VIEWER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('DRAFT','QUEUED','ASSIGNED','RUNNING','COMPLETED','COMPLETED_MANUAL','PARTIALLY_COMPLETED','NEEDS_DECISION','NEEDS_RECOVERY','NEEDS_HUMAN_VERIFICATION','PAUSED_AUTH','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE actor_type AS ENUM ('SYSTEM', 'USER', 'BRIDGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE run_status AS ENUM ('QUEUED','RUNNING','COMPLETED','NEEDS_DECISION','NEEDS_RECOVERY','NEEDS_HUMAN_VERIFICATION','PAUSED_AUTH','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE step_status AS ENUM ('PENDING','RUNNING','COMPLETED','SKIPPED','NEEDS_DECISION','NEEDS_RECOVERY','NEEDS_HUMAN_VERIFICATION','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE nusuk_session_status AS ENUM ('CONNECTED','DEGRADED','DISCONNECTED','BUSY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(200) NOT NULL,
  commercial_reg_no varchar(32) NOT NULL UNIQUE, nusuk_license_no varchar(64),
  status tenant_status NOT NULL DEFAULT 'ACTIVE', subscription_plan varchar(64) NOT NULL DEFAULT 'FOUNDATION',
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Riyadh', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(320) NOT NULL UNIQUE,
  password_hash text NOT NULL, display_name varchar(200) NOT NULL, platform_role varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS tenant_users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), user_id varchar NOT NULL REFERENCES users(id),
  role tenant_role NOT NULL, status membership_status NOT NULL DEFAULT 'INVITED', invited_by varchar REFERENCES users(id), activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, UNIQUE(tenant_id,user_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), order_number integer NOT NULL,
  source varchar(16) NOT NULL, workflow_key varchar(100) NOT NULL, priority integer NOT NULL, status order_status NOT NULL DEFAULT 'DRAFT',
  payload jsonb NOT NULL, command_center_version integer NOT NULL, idempotency_key varchar(64) NOT NULL,
  assigned_user_id varchar REFERENCES users(id), assigned_at timestamptz, nusuk_reference varchar(200), created_by_user_id varchar REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,order_number)
);
CREATE TABLE IF NOT EXISTS order_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), order_id varchar NOT NULL REFERENCES orders(id),
  event_type varchar(100) NOT NULL, actor_type actor_type NOT NULL, actor_id varchar, payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bridge_devices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), user_id varchar NOT NULL REFERENCES users(id),
  device_token_hash varchar(64) NOT NULL UNIQUE, extension_version varchar(32) NOT NULL, last_seen_at timestamptz, status varchar(32) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS nusuk_sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), user_id varchar NOT NULL REFERENCES users(id),
  status nusuk_session_status NOT NULL DEFAULT 'DISCONNECTED', bound_tab_id integer, last_heartbeat_at timestamptz, disconnected_at timestamptz, current_run_id varchar,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, UNIQUE(tenant_id,user_id)
);
CREATE TABLE IF NOT EXISTS adapter_health_checks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), workflow_key varchar(100) NOT NULL,
  total_targets integer NOT NULL, resolved_targets integer NOT NULL, missing_targets jsonb NOT NULL DEFAULT '[]', checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);

-- Defence in depth. The application role must not be a superuser or own these tables.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['tenant_users','orders','order_events','bridge_devices','nusuk_sessions','adapter_health_checks'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant'', true)) WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))', table_name);
  END LOOP;
END $$;

-- Append-only protection. Events may be inserted and read, never mutated or removed.
CREATE OR REPLACE FUNCTION reject_order_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'order_events is append-only'; END $$;
DROP TRIGGER IF EXISTS order_events_immutable ON order_events;
CREATE TRIGGER order_events_immutable BEFORE UPDATE OR DELETE ON order_events FOR EACH ROW EXECUTE FUNCTION reject_order_event_mutation();
