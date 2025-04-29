import { api, APIError } from "encore.dev/api";
import { db } from "../db";

//create an offer for a given application
export const createOffer = api(
  { method: "POST", path: "/offer", expose: true },
  async ({ applicationId, workspaceId, amount }: { applicationId: string; workspaceId: string; amount: number }): Promise<{ id: string }> => {
    try {
        const id = crypto.randomUUID();
        console.log(`Creating offer offer:`, { applicationId, workspaceId, amount });
        await db.exec`
          INSERT INTO offer (id, workspace_id, application_id, amount)
          VALUES (${id}::uuid, ${workspaceId}::uuid, ${applicationId}::uuid, ${amount})
        `;
        return { id };
    } catch (error) {
        console.error("Error creating offer:", error);
        throw APIError.internal("Failed to create offer");
    }

  }
);

// Fetch all offers of the current workspace
export const fetchOffers = api(
    { method: "GET", path: "/offers", expose: true },
    async (): Promise<{ offers: { id: string; amount: number }[] }> => {
        try {
            const rows = [];
            for await (const row of db.query`
              SELECT id, amount
              FROM offer
            `) {
              rows.push({ id: row.id as string, amount: row.amount as number });
            }
            return { offers: rows };
        }
        catch (error) {
            console.error("Error fetching offers:", error);
            throw APIError.internal("Failed to fetch offers");
        }
    }
);