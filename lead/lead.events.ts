import { publishEvent } from "../utils/sns";

// Publish the lead.new event
export const emitLeadNewEvent = (id: string, name: string, email: string) => {
  publishEvent("lead.new", { id, name, email });
};