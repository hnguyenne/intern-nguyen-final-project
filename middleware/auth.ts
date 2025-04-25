import { APIError } from "encore.dev/api";
import { createLogtoClient } from "../user/logto-config";

interface AuthContext {
    userId: string;
    roles: string[];
    scopes: string[];
}

export async function verifyLogtoAuth(token: string): Promise<AuthContext> {
    try {
        const logtoClient = createLogtoClient();
        const userInfo = await logtoClient.fetchUserInfo();
        
        if (!userInfo.sub) {
            throw APIError.unauthenticated("Invalid token");
        }

        // Get user's roles from Logto
        const roles = Array.isArray(userInfo.roles) ? userInfo.roles : [];
        const scopes = Array.isArray(userInfo.scopes) ? userInfo.scopes : [];
        
        return {
            userId: userInfo.sub,
            roles,
            scopes
        };
    } catch (error) {
        console.error("Auth verification error:", error);
        throw APIError.unauthenticated("Invalid token");
    }
}

export function checkRoles(auth: AuthContext, requiredRoles: string[]): void {
    if (!requiredRoles.some(role => auth.roles.includes(role))) {
        throw APIError.permissionDenied("Insufficient permissions");
    }
}

export function checkScopes(auth: AuthContext, requiredScopes: string[]): void {
    if (!requiredScopes.every(scope => auth.scopes.includes(scope))) {
        throw APIError.permissionDenied("Missing required scopes");
    }
} 