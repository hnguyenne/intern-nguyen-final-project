import { api, APIError } from "encore.dev/api";
import { db } from "../db";

//create a new application
export const createApplication = api(
  { method: "POST", path: "/application", expose: true },
  async ({ leadId, status }: { leadId: string; status: string }): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    await db.exec`
      INSERT INTO application (id, workspace_id, lead_id, status)
      VALUES (${id}::uuid, current_setting('app.workspace_id')::uuid, ${leadId}::uuid, ${status})
    `;
    return { id };
  }
);

// Fetch all applications of the current workspace
export const fetchApplications = api(
    { method: "GET", path: "/applications", expose: true },
    async (): Promise<{ applications: { id: string; status: string }[] }> => {
      const rows: { id: string; status: string }[] = [];
      for await (const row of db.query`
        SELECT id, status
        FROM application
      `) {
        rows.push({ id: row.id as string, status: row.status as string });
      }
      return { applications: rows };
    }
  );