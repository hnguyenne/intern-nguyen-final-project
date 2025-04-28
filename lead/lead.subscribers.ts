import { snsEmitter } from "../utils/sns";
import { addToDLQ, retryDLQ } from "../utils/dlq";

const MAX_RETRIES = 3;

snsEmitter.on("lead.new", (message) => {
  try {
    console.log(`Subscriber received event:`, message);

     // Simulate processing logic
    if (Math.random() < 0.5) {
      throw new Error("Simulated processing failure");
    }
    console.log(`Subscriber successfully processed event:`, message);
  } catch (error) {
    console.error(`Subscriber failed to process event:`, message, error);
    addToDLQ("lead.new", message); // Add to DLQ on failure

    // Automatically retry messages from the DLQ
    retryDLQ("lead.new", (retryMessage) => {
      console.log(`Retrying message:`, retryMessage);

      // Simulate retry logic
      if (Math.random() < 0.5) {
        throw new Error("Simulated retry failure");
      }

      console.log(`Successfully retried message:`, retryMessage);
    }, MAX_RETRIES);
  }
  
});
