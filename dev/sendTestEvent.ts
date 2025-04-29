import { api, APIError } from "encore.dev/api";
import { clickhouseClient } from "../utils/clickhouse";
import { emitLeadNewEvent } from "../lead/lead.events";


export const sendQuoteAPI = api(
  { method: "POST", path: "/dev/sendQuote", expose: true },
  async ({ quoteId, workspaceId, amount }: { quoteId: string; workspaceId: string; amount: number }): Promise<{ success: boolean }> => {
    try {
      console.log(`Sending quote:`, { quoteId, workspaceId, amount });

      // Log the quote sent event to ClickHouse
      await clickhouseClient.insert({
        table: 'events',
        values: [
          {
            event_type: 'quote.sent', // Event type
            payload: JSON.stringify({
              quoteId,
              workspaceId,
              amount,
            }), // Additional data about the quote
            created_at: new Date().toISOString().replace('T', ' ').split('.')[0], // Remove milliseconds
          },
        ],
        format: 'JSONEachRow', // Specify the format explicitly
      });

      console.log(`Quote sent successfully:`, { quoteId, workspaceId, amount });
      return { success: true };
    } catch (error) {
      console.error(`Failed to send quote:`, { quoteId, workspaceId, amount }, error);
      throw APIError.internal("Failed to send quote");
    }
  }
);

export const sendLeadTestEvent = api(
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