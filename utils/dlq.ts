export const dlq: { [topic: string]: { message: any; retryCount: number }[] } = {};

// Add a message to the DLQ
export const addToDLQ = (topic: string, message: any) => {
  if (!dlq[topic]) {
    dlq[topic] = [];
  }
  console.log(`Message added to DLQ for topic "${topic}":`, message);
  dlq[topic].push({ message, retryCount: 0 });
};

// Retry messages from the DLQ
export const retryDLQ = (topic: string, handler: (message: any) => void, maxRetries: number) => {
  if (!dlq[topic] || dlq[topic].length === 0) {
    console.log(`No messages in DLQ for topic "${topic}"`);
    return;
  }

  console.log(`Retrying messages from DLQ for topic "${topic}"...`);
  const remainingMessages = [];

  for (const { message, retryCount } of dlq[topic]) {
    if (retryCount >= maxRetries) {
      console.error(`Message exceeded max retries for topic "${topic}":`, message);
      continue; // Skip messages that have exceeded the retry limit
    }

    try {
      handler(message);
      console.log(`Message successfully retried for topic "${topic}":`, message);
    } catch (error) {
      console.error(`Retry failed for message in topic "${topic}":`, message, error);
      remainingMessages.push({ message, retryCount: retryCount + 1 }); // Increment retry count
    }
  }

  dlq[topic] = remainingMessages; // Update DLQ with remaining messages
};