import { api, APIError } from "encore.dev/api";
import { EventEmitter } from "events";

// Define the lead.new event
export const eventEmitter = new EventEmitter();

// Event listener for lead.new
eventEmitter.on("lead.new", ({ id, name, email }) => {
    console.log(`New lead created: ID=${id}, Name=${name}, Email=${email}`);
  });
  
