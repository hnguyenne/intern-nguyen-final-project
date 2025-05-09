import { api, APIError } from "encore.dev/api";
import { db } from "../db";
import { publishEvent } from "../utils/sns";
import { clickhouseClient } from "../utils/clickhouse";
import { verifyLogtoAuth, hasPermission } from "../middleware/auth";

// POST /insights: Store tenant-scoped insights
export const createInsight = api(
  { method: "POST", path: "/insights", expose: true },
  async ({ token, data }: { token: string; data: string }): Promise<{ id: string }> => {
    try {
      // Verify the user's token
      const auth = await verifyLogtoAuth(token);

      // Check if the user has the required permission
      if (!hasPermission(auth, 'write:insight')) {
        throw APIError.permissionDenied("You do not have permission to create insights.");
      }

      // Get the current workspace ID
      const currentWorkspace = await db.queryRow`
        SELECT current_setting('app.workspace_id', true) as workspace_id
      `;

      if (!currentWorkspace?.workspace_id) {
        throw APIError.invalidArgument("No current workspace set");
      }

      const workspaceId = currentWorkspace.workspace_id;
      const id = crypto.randomUUID();
      console.log(`Creating insight for workspace:`, { workspaceId, data });

      // Insert the insight into the database
      await db.exec`
        INSERT INTO insights (id, workspace_id, data)
        VALUES (${id}::uuid, ${workspaceId}::uuid, ${data})
      `;

      // Emit the Insight.New event
      publishEvent("Insight.New", { id, workspaceId, data });

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
  async ({ token }: { token: string}): Promise<{ insights: { id: string; data: string }[] }> => {
    try {
      // Verify the user's token
      const auth = await verifyLogtoAuth(token);

      console.log('User permissions:', auth.scopes);
      
      // Check if the user has the required permission
      if (!hasPermission(auth, 'read:insight')) {
        throw APIError.permissionDenied("You do not have permission to read insights.");
      }

      // Get the current workspace ID
      const currentWorkspace = await db.queryRow`
        SELECT current_setting('app.workspace_id', true) as workspace_id
      `;

      if (!currentWorkspace?.workspace_id) {
        throw APIError.invalidArgument("No current workspace set");
      }

      const workspaceId = currentWorkspace.workspace_id;
      const rows: { id: string; data: string }[] = [];
      for await (const row of db.query`
        SELECT id, data
        FROM insights
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

