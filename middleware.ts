import jwt, { JwtPayload } from "jsonwebtoken";
import { APIError } from "encore.dev/api";
import { db } from "./db";

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key"; // Replace with your actual secret key

export class JWTSimulator{
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as jwt.JwtPayload;
      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }

  static async getUserFromToken(token: string): Promise<{ id: string; email: string; workspaceId: string } | null> {
    const decoded = this.verifyToken(token);
    if (!decoded) return null;

    const user = await db.queryRow`
      SELECT id, email, workspace_id
      FROM users
      WHERE id = ${decoded.userId}
    `;

    return user ? {
      id: user.id,
      email: user.email,
      workspaceId: user.workspace_id
    } : null;
  }
}