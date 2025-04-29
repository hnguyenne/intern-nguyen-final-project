import { api, APIError } from "encore.dev/api";
import { clickhouseClient } from "../utils/clickhouse";

export const getQuoteRateStatsAPI = api(
    { method: "GET", path: "/stats/quote-rate", expose: true },
    async (): Promise<{ success: boolean; data: any[] }> => {
      try {
        // Query ClickHouse for per-tenant quote statistics
        const query = `
          SELECT
            JSONExtractString(payload, 'workspaceId') AS workspace_id,
            COUNT(*) AS sent_quotes,
            SUM(CASE WHEN event_type = 'quote.conversion' AND JSONExtractString(payload, 'status') = 'accepted' THEN 1 ELSE 0 END) AS accepted_quotes,
            SUM(CASE WHEN event_type = 'quote.conversion' AND JSONExtractString(payload, 'status') = 'rejected' THEN 1 ELSE 0 END) AS rejected_quotes
          FROM events
          WHERE event_type IN ('quote.sent', 'quote.conversion')
          GROUP BY workspace_id
        `;
  
        const result = await clickhouseClient.query({
          query,
          format: 'JSON',
        });
  
        const data = (await result.json() as unknown) as any[];
  
        console.log("Quote rate stats retrieved successfully:", data);
  
        return { success: true, data };
      } catch (error) {
        console.error("Failed to retrieve quote rate stats:", error);
        throw APIError.internal("Failed to retrieve quote rate stats");
      }
    }
);