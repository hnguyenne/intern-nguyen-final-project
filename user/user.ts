import { api, APIError } from "encore.dev/api";
import { db } from "../db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

export interface User {
    id?: string;
    email: string;
    workspaceId: string;
}

export const registerUser = api(
    { method: "POST", path: "/user/register", expose: true },
    async ({ email, password, workspaceId }: { email: string; password: string, workspaceId: string }): Promise<User> => {
      const id = crypto.randomUUID();
      const passwordHash = bcrypt.hashSync(password, 10);
      await db.exec`
        INSERT INTO users (id, email, password_hash, workspace_id)
        VALUES (${id}::uuid, ${email}, ${passwordHash}, ${workspaceId}::uuid)
      `;
      return { id, email, workspaceId };
    }
  );

export const loginUser = api(
    { method: "POST", path: "/user/login", expose: true },
    async ({ email, password }: { email: string; password: string }): Promise<{ token: string }> => {
      const row = await db.queryRow`
        SELECT id, password_hash, workspace_id
        FROM users
        WHERE email = ${email}
      `;
      if (!row || !bcrypt.compareSync(password, row.password_hash)) {
        throw APIError.unauthenticated("Invalid email or password");
      }

      const workspaceId = row.workspace_id;
      await db.rawExec(`SELECT set_config('app.workspace_id', '${workspaceId}', false)`);
  
      const token = jwt.sign({ userId: row.id }, SECRET_KEY);
      return { token };
    }
);

export const logoutUser = api(
    { method: "POST", path: "/user/logout", expose: true },
    async (): Promise<{ success: boolean }> => {
      // Reset the current workspace
      await db.rawExec(`SELECT set_config('app.workspace_id', NULL, false)`);
      return { success: true };
    }
);

export const listUsers = api(
    { method: "GET", path: "/users", expose: true },
    async (): Promise<{ users: { id: string; email: string }[] }> => {
      const rows = [];
      for await (const row of db.query`
        SELECT id, email
        FROM users
      `) {
        rows.push({ id: row.id, email: row.email });
      }
      return { users: rows };
    }
  );