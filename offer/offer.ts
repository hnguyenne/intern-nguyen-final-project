import { api, APIError } from "encore.dev/api";
import { db } from "../db";

//create an offer for a given application
export const createOffer = api(
  { method: "POST", path: "/offer", expose: true },
  async ({ applicationId, amount }: { applicationId: string; amount: number }): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    await db.exec`
      INSERT INTO offer (id, workspace_id, application_id, amount)
      VALUES (${id}::uuid, current_setting('app.workspace_id')::uuid, ${applicationId}::uuid, ${amount})
    `;
    return { id };
  }
);

// Fetch all offers of the current workspace
export const fetchOffers = api(
    { method: "GET", path: "/offers", expose: true },
    async (): Promise<{ offers: { id: string; amount: number }[] }> => {
      const rows = [];
      for await (const row of db.query`
        SELECT id, amount
        FROM offer
      `) {
        rows.push({ id: row.id as string, amount: row.amount as number });
      }
      return { offers: rows };
    }
);