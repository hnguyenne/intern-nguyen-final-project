import { api, APIError } from "encore.dev/api";
import { db } from "../db";

// Create a lead in the current workspace
export const createLead = api(
  { method: "POST", path: "/lead", expose: true },
  async ({ name, email }: { name: string; email: string }): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    await db.exec`
      INSERT INTO lead (id, workspace_id, name, email)
      VALUES (${id}::uuid, current_setting('app.workspace_id')::uuid, ${name}, ${email})
    `;
    return { id };
  }
);

/// Fetch all leads of the current workspace
export const fetchLeads = api(
    { method: "GET", path: "/leads", expose: true },
    async (): Promise<{ leads: { id: string; name: string; email: string, workspace_id: string }[] }> => {
      const rows: { id: string; name: string; email: string, workspace_id: string }[] = [];
      for await (const row of db.query`
        SELECT id, name, email, workspace_id
        FROM lead
      `) {
        rows.push({
          id: row.id as string,
          name: row.name as string,
          email: row.email as string,
          workspace_id: row.workspace_id as string,
        });
      }
      return { leads: rows };
    }
  );