import { EventEmitter } from "events";

// Define the SNS-like event emitter
export const snsEmitter = new EventEmitter();

// Function to publish an event to a topic
export const publishEvent = (topic: string, message: any) => {
  console.log(`Publishing event to topic: ${topic}`, message);
  snsEmitter.emit(topic, message);
};