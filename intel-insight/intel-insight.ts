import { api, APIError } from "encore.dev/api";
import { db } from "../db";
import { publishEvent } from "../utils/sns";
import { clickhouseClient } from "../utils/clickhouse";

// POST /insights: Store tenant-scoped insights
export const createInsight = api(
  { method: "POST", path: "/insights", expose: true },
  async ({ workspaceId, data }: { workspaceId: string; data: string }): Promise<{ id: string }> => {
    try {
      const id = crypto.randomUUID();
      console.log(`Creating insight for workspace:`, { workspaceId, data });

      // Insert the insight into the database
      await db.exec`
        INSERT INTO insights (id, workspace_id, data)
        VALUES (${id}::uuid, ${workspaceId}::uuid, ${data})
      `;

      // Emit the Insight.New event
      publishEvent("Insight.New", { id, workspaceId, data });

      // Log the action in ClickHouse
      await clickhouseClient.insert({
        table: 'audit_log',
        values: [
          {
            action: 'Insight Created',
            workspace_id: workspaceId,
            details: data,
            created_at: new Date().toISOString().replace('T', ' ').split('.')[0], // Remove milliseconds
          },
        ],
        format: 'JSONEachRow',
      });

      return { id };
    } catch (error) {
      console.error("Error creating insight:", error);
      throw APIError.internal("Failed to create insight");
    }
  }
);

// GET /insights: Return workspace-specific records
export const getInsights = api(
    { method: "GET", path: "/insights", expose: true },
    async ({ workspaceId }: { workspaceId: string }): Promise<{ insights: { id: string; data: string }[] }> => {
      try {
        const rows: { id: string; data: string }[] = [];
        for await (const row of db.query`
          SELECT id, data
          FROM insights
          WHERE workspace_id = ${workspaceId}::uuid
        `) {
          rows.push({ id: row.id as string, data: row.data as string });
        }
  
        // Log the action in ClickHouse
        await clickhouseClient.insert({
            table: 'audit_log',
            values: [
            {
                action: 'Insights Retrieved',
                workspace_id: workspaceId,
                details: 'Fetched all insights',
                created_at: new Date().toISOString().replace('T', ' ').split('.')[0], // Remove milliseconds
            },
            ],
            format: 'JSONEachRow',
        });
  
        return { insights: rows };
      } catch (error) {
        console.error("Error fetching insights:", error);
        throw APIError.internal("Failed to fetch insights");
      }
    }
  );