import { SQLDatabase } from "encore.dev/storage/sqldb";

// Create a single SQLDatabase instance
export const db = new SQLDatabase("main", { migrations: "./migrations" });