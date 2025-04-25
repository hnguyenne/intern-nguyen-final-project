import { APIError } from "encore.dev/api";
import { createLogtoClient, logtoConfig } from "../user/logto-config";

interface AuthContext {
    userId: string;
    roles: string[];
    scopes: string[];
}

interface UserInfo {
    sub: string;
    name?: string | null;
    email?: string;
    [key: string]: unknown;
}

interface TokenInfo {
    active: boolean;
    scope?: string;
    roles?: string[];
    [key: string]: unknown;
}

export async function verifyLogtoAuth(token: string): Promise<AuthContext> {
    try {
        const logtoClient = createLogtoClient();
        console.log('Received token:', token);

        try {
            // Ensure endpoint doesn't end with a slash
            const baseUrl = logtoConfig.endpoint.replace(/\/$/, '');
            
            // First, verify the token using introspection
            const params = new URLSearchParams();
            params.append('client_id', logtoConfig.appId);
            if (logtoConfig.appSecret) {
                params.append('client_secret', logtoConfig.appSecret);
            }
            params.append('token', token);

            const tokenInfoResponse = await fetch(`${baseUrl}/oidc/token/introspection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            });
            
            if (!tokenInfoResponse.ok) {
                console.log('Token introspection response:', await tokenInfoResponse.text().catch(() => 'Failed to get response text'));
                throw new Error(`Failed to introspect token: ${tokenInfoResponse.status}`);
            }
            
            const tokenInfo = await tokenInfoResponse.json() as TokenInfo;
            console.log('Token introspection result:', tokenInfo);
            
            if (!tokenInfo.active) {
                throw new Error('Token is not active');
            }

            // Get user info using the token
            const userInfoResponse = await fetch(`${baseUrl}/oidc/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!userInfoResponse.ok) {
                console.log('User info response:', await userInfoResponse.text().catch(() => 'Failed to get response text'));
                throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
            }
            
            const userInfo = await userInfoResponse.json() as UserInfo;
            console.log('User info from token:', userInfo);
            
            if (!userInfo.sub) {
                throw new Error('No user ID in response');
            }
            
            // Extract scopes from token info
            let scopes: string[] = [];
            if (typeof tokenInfo.scope === 'string') {
                scopes = tokenInfo.scope.split(' ');
            }
            
            // Extract roles if present
            let roles: string[] = [];
            if (tokenInfo.role && Array.isArray(tokenInfo.role)) {
                roles = tokenInfo.role.map((roleObj: any) => roleObj.name);
            }
            
            console.log('Extracted user ID:', userInfo.sub);
            console.log('Extracted roles:', roles);
            console.log('Extracted scopes:', scopes);
            
            return {
                userId: userInfo.sub,
                roles,
                scopes
            };
            
        } catch (e) {
            const error = e instanceof Error ? e : new Error('Unknown error verifying token');
            console.log('Error verifying token:', error);
            throw APIError.unauthenticated(`Invalid token: ${error.message}`);
        }
    } catch (e) {
        const error = e instanceof Error ? e : new Error('Unknown auth verification error');
        console.error("Auth verification error:", error);
        throw APIError.unauthenticated("Invalid token");
    }
}

export function isAdmin(auth: AuthContext): boolean {
    return auth.roles.includes('admin');
}

export function checkRoles(auth: AuthContext, requiredRoles: string[]): string[] {
    if (!requiredRoles.some(role => auth.roles.includes(role))) {
        throw APIError.permissionDenied("Insufficient permissions");
    }
    return auth.roles;
}

export function checkScopes(auth: AuthContext, requiredScopes: string[]): void {
    // Add resource prefix to required scopes
    const resourcePrefix = 'http://127.0.0.1:4000/';
    const fullRequiredScopes = requiredScopes.map(scope => 
        scope.startsWith(resourcePrefix) ? scope : `${resourcePrefix}${scope}`
    );
    
    console.log('Auth scopes:', auth.scopes);
    console.log('Required scopes (before prefix):', requiredScopes);
    console.log('Required scopes (after prefix):', fullRequiredScopes);
    
    const missingScopes = fullRequiredScopes.filter(scope => !auth.scopes.includes(scope));
    if (missingScopes.length > 0) {
        console.log('Missing scopes:', missingScopes);
        throw APIError.permissionDenied(`Missing required scopes: ${missingScopes.join(', ')}`);
    }
} 