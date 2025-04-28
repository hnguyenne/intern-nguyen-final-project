import { snsEmitter } from "../utils/sns";

// Subscriber 1: Logs the event
snsEmitter.on("lead.new", (message) => {
  console.log(`Subscriber 1 received event:`, message);
});
