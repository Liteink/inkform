-- Migration 2026-08-29: projects + forms.project_id (idempotent-ish; ALTER fails on re-run is fine)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE forms ADD COLUMN project_id TEXT REFERENCES projects(id);
CREATE INDEX IF NOT EXISTS idx_forms_project ON forms(project_id);
INSERT OR IGNORE INTO projects (id, name) VALUES ('general', 'General');
UPDATE forms SET project_id = 'general' WHERE project_id IS NULL;
