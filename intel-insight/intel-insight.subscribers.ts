import { snsEmitter } from "../utils/sns";
import { clickhouseClient } from "../utils/clickhouse";

snsEmitter.on("Insight.New", async (message) => {
  try {
    console.log(`Subscriber received Insight.New event:`, message);

    // Process the event (e.g., log it to ClickHouse or perform other actions)
          await clickhouseClient.insert({
            table: 'audit_log',
            values: [
              {
                action: 'Insight Created',
                workspace_id: message.workspaceId, // Assuming workspaceId is part of the message payload
                details: message.details || {}, // Assuming 'details' is part of the message payload or default to an empty object
                created_at: new Date().toISOString().replace('T', ' ').split('.')[0], // Remove milliseconds
              },
            ],
            format: 'JSONEachRow',
          });

    console.log(`Subscriber successfully processed Insight.New event:`, message);
  } catch (error) {
    console.error("Error processing Insight.New event:", error);
  }
});