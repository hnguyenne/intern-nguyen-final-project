import { api, APIError } from "encore.dev/api";
import { db } from "../db";
import { emitLeadNewEvent } from "./lead.events";
import "./lead.subscribers";

// Create a lead in the current workspace
export const createLead = api(
  { method: "POST", path: "/lead", expose: true },
  async ({ name, email }: { name: string; email: string }): Promise<{ id: string }> => {
    try {
        const id = crypto.randomUUID();
        await db.exec`
        INSERT INTO lead (id, workspace_id, name, email)
        VALUES (${id}::uuid, current_setting('app.workspace_id')::uuid, ${name}, ${email})
        `;
        emitLeadNewEvent(id, name, email);
        return { id };
    } catch (error) {
        console.error("Error creating lead:", error);
        throw APIError.internal("Failed to create lead");
    }
  }
);

/// Fetch all leads of the current workspace
export const fetchLeads = api(
  { method: "GET", path: "/leads", expose: true },
    async (): Promise<{ leads: { id: string; name: string; email: string, workspace_id: string }[] }> => {
      try {
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
      } catch (error) {
        console.error("Error fetching leads:", error);
        throw APIError.internal("Failed to fetch leads");
      }
    }
);

export const sendTestEvent = api(
  { method: "POST", path: "/dev/sendEvent", expose: true },
  async ({ id, name, email }: { id: string; name: string; email: string }): Promise<{ success: boolean }> => {
    try {
      // Emit the lead.new event
      emitLeadNewEvent(id, name, email);
      console.log(`Test event emitted: ID=${id}, Name=${name}, Email=${email}`);
      return { success: true };
    } catch (error) {
      console.error("Error emitting test event:", error);
      throw APIError.internal("Failed to emit test event");
    }
  }
);
