import { api, APIError } from "encore.dev/api";
import { clickhouseClient } from "../utils/clickhouse";
import { v4 as uuidv4 } from "uuid";
import { createOffer } from "../offer/offer";

export const sendQuoteAPI = api(
  { method: "POST", path: "/quote/send", expose: true },
  async ({ workspaceId, amount, applicationId }: { workspaceId: string; amount: number, applicationId: string }): Promise<{ success: boolean }> => {
    let generatedQuoteId: string | undefined;
    try {
        generatedQuoteId = uuidv4();
        console.log(`Sending quote:`, { workspaceId, amount });

        // Log the quote sent event to ClickHouse
        await clickhouseClient.insert({
            table: 'events',
            values: [
            {
                event_type: 'quote.sent',
                payload: JSON.stringify({
                    generatedQuoteId,
                    workspaceId,
                    amount,
                    applicationId,
                }),
                created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
            },
            ],
            format: 'JSONEachRow',
      });

      // Add audit log
      console.log(`Audit Log: Quote sent`, { generatedQuoteId, workspaceId, amount, applicationId });

      return { success: true };
    } catch (error) {
      console.error(`Failed to send quote:`, { generatedQuoteId, workspaceId, amount }, error);
      throw APIError.internal("Failed to send quote");
    }
  }
);

export const trackConversionAPI = api(
    { method: "POST", path: "/conversion", expose: true },
    async ({ quoteId, status }: { quoteId: string; status: string }): Promise<{ success: boolean }> => {
        let workspaceId: string | undefined;
        let applicationId: string | undefined;
        let amount: number | undefined;
      try {
        console.log(`Tracking conversion:`, { quoteId, status });
        
        // Retrieve workspaceId associated with the quoteId
        const query = `
        SELECT 
            JSONExtractString(payload, 'workspaceId') AS workspace_id,
            JSONExtractString(payload, 'applicationId') AS application_id,
            JSONExtractString(payload, 'amount') AS amount
        FROM events
        WHERE event_type = 'quote.sent' AND JSONExtractString(payload, 'generatedQuoteId') = '${quoteId}'
        LIMIT 1
        `;

        const result = await clickhouseClient.query({
            query,
            format: 'JSON',
        });

        const resultData = (await result.json() as unknown) as any; // Parse the full result object
        const data = resultData.data; 

        if (data.length === 0) {
            console.error(`No matching quoteId found:`, { quoteId });
            throw APIError.invalidArgument("Invalid quoteId");
        }

        console.log(data[0].workspace_id);
        workspaceId = data[0].workspace_id;
        applicationId = data[0].application_id;
        amount = parseFloat(data[0].amount);

        // Log the conversion event to ClickHouse
        await clickhouseClient.insert({
          table: 'events',
          values: [
            {
              event_type: 'quote.conversion',
              payload: JSON.stringify({
                quoteId,
                workspaceId,
                applicationId,
                amount,
                status, //"accepted" or "rejected"
              }),
              created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
            },
          ],
          format: 'JSONEachRow',
        });
  
        console.log(`Audit Log: Conversion tracked`, { quoteId, workspaceId, status });
        
        // If the quote is accepted, create an offer
        if (status === "accepted") {
            console.log(`Creating offer for accepted quote:`, { quoteId, workspaceId });

            console.log(`Creating offer for applicationId:`, { applicationId, workspaceId, amount });
            const offerResponse = await createOffer({
                applicationId: applicationId!,
                workspaceId: workspaceId!,
                amount: amount,
            });

            console.log(`Offer created successfully:`, offerResponse);
        }

        return { success: true };
      } catch (error) {
        console.error(`Failed to track conversion:`, { quoteId, workspaceId, status }, error);
        throw APIError.internal("Failed to track conversion");
      }
    }
  );

  export const getConversionStatsAPI = api(
    { method: "GET", path: "/stats/conversion", expose: true },
    async (): Promise<{ success: boolean; data: any[] }> => {
      try {
        const query = `
          SELECT
            JSONExtractString(payload, 'workspaceId') AS workspace_id,
            COUNT(*) AS total_quotes,
            SUM(CASE WHEN JSONExtractString(payload, 'status') = 'accepted' THEN 1 ELSE 0 END) AS accepted_quotes,
            SUM(CASE WHEN JSONExtractString(payload, 'status') = 'rejected' THEN 1 ELSE 0 END) AS rejected_quotes
          FROM events
          WHERE event_type = 'quote.conversion'
          GROUP BY workspace_id
        `;
  
        const result = await clickhouseClient.query({
          query,
          format: 'JSON',
        });
  
        const data = (await result.json() as unknown) as any[];
  
        console.log("Conversion stats retrieved successfully:", data);
  
        return { success: true, data };
      } catch (error) {
        console.error("Failed to retrieve conversion stats:", error);
        throw APIError.internal("Failed to retrieve conversion stats");
      }
    }
);