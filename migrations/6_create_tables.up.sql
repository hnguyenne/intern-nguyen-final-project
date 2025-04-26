CREATE TABLE lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

CREATE TABLE application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    lead_id UUID REFERENCES lead(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

CREATE TABLE offer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    application_id UUID REFERENCES application(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

ALTER TABLE lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE application ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_isolation_policy
  ON lead
  USING (workspace_id::text = current_setting('app.workspace_id'));

CREATE POLICY application_isolation_policy
  ON application
  USING (workspace_id::text = current_setting('app.workspace_id'));

CREATE POLICY offer_isolation_policy
  ON offer
  USING (workspace_id::text = current_setting('app.workspace_id'));

ALTER TABLE lead FORCE ROW LEVEL SECURITY;
ALTER TABLE application FORCE ROW LEVEL SECURITY;
ALTER TABLE offer FORCE ROW LEVEL SECURITY;