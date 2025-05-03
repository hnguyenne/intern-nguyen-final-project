CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY insights_isolation_policy
  ON insights
  USING (workspace_id::text = current_setting('app.workspace_id'));

ALTER TABLE insights FORCE ROW LEVEL SECURITY;