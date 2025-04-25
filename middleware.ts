import { APIError } from "encore.dev/api";
import { logtoConfig, createLogtoClient } from './user/logto-config';

export const verifyToken = async (token?: string): Promise<string> => {
  try {
      if (!token) {
          throw APIError.unauthenticated("No token provided");
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      const logtoClient = createLogtoClient();
      // Get user info
      const userInfo = await logtoClient.fetchUserInfo();

      if (!userInfo.sub) {
          throw APIError.unauthenticated("Invalid token");
      }

      return userInfo.sub;
  } catch (error) {
      console.error("Token verification failed:", error);
      throw APIError.unauthenticated("Invalid token");
  }
};

export async function verifyLogtoAuth(token: string) {
  if (!token) {
      throw APIError.unauthenticated("Token is missing");
  }

  try {
    const logtoClient = createLogtoClient();
    await logtoClient.getAccessToken(token);

    const userInfo = await logtoClient.fetchUserInfo();
    if (!userInfo.sub) {
      throw APIError.unauthenticated("Invalid user information");
    }
    return {
      userId: userInfo.sub,
      scopes: (userInfo.scopes as string[]) || []
    };
    
  } catch (error) {
    console.error("Logto authentication error:", error);
    throw APIError.unauthenticated("Invalid or expired token");
  }
}

export function checkScopes(userScopes: string[], requiredScopes: string[]) {
  const hasAllScopes = requiredScopes.every(scope => 
      userScopes.includes(scope)
  );

  if (!hasAllScopes) {
      throw APIError.permissionDenied("Insufficient permissions");
  }
}