import { snsEmitter } from "../utils/sns";
import { addToDLQ, retryDLQ } from "../utils/dlq";
import { clickhouseClient } from "../utils/clickhouse";

const MAX_RETRIES = 3;

snsEmitter.on("lead.new", async (message) => {
  try {
    console.log(`Subscriber received event:`, message);

     // Simulate processing logic
    if (Math.random() < 0.5) {
      throw new Error("Simulated processing failure");
    }

    // Log the successfully processed event to ClickHouse
    await clickhouseClient.insert({
      table: 'events',
      values: [
        {
          event_type: 'lead.new', // Column name: event_type
          payload: JSON.stringify(message), // Column name: payload
          retried_at: new Date().toISOString().replace('T', ' ').split('.')[0], // Remove milliseconds
        },
      ],
      format: 'JSONEachRow', // Specify the format explicitly
    });

    console.log(`Subscriber successfully processed event:`, message);
  } catch (error) {
    console.error(`Subscriber failed to process event:`, message, error);
    addToDLQ("lead.new", message); // Add to DLQ on failure

    // Automatically retry messages from the DLQ
    retryDLQ("lead.new", async (retryMessage) => {
      console.log(`Retrying message:`, retryMessage);

      // Simulate retry logic
      if (Math.random() < 0.5) {
        throw new Error("Simulated retry failure");
      }

      // Log the retried event to ClickHouse
      await clickhouseClient.insert({
        table: 'events',
        values: [
          {
            event_type: 'lead.new.retry', // Column name: event_type
            payload: JSON.stringify(retryMessage), // Column name: payload
            retried_at: new Date().toISOString().replace('T', ' ').split('.')[0], // Remove milliseconds
          },
        ],
        format: 'JSONEachRow', // Specify the format explicitly
      });

      console.log(`Successfully retried message:`, retryMessage);
    }, MAX_RETRIES);
  }
  
});
