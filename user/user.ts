import { api, APIError } from "encore.dev/api";
import { logtoConfig, createLogtoClient } from './logto-config';
import { verifyLogtoAuth } from '../middleware/auth';

// Login endpoint
export const login = api(
    { method: "GET", path: "/auth/login", expose: true },
    async (): Promise<{ redirect_url: string }> => {
        try {
            const logtoClient = createLogtoClient();
            const callbackUrl = `${process.env.API_URL || 'http://localhost:4000'}/auth/callback`;
            
            console.log('Starting login flow with config:', {
                endpoint: logtoConfig.endpoint,
                appId: logtoConfig.appId,
                configuredScopes: logtoConfig.scopes,
                resources: logtoConfig.resources
            });
            
            // Check if we already have a valid session
            try {
                const context = await logtoClient.getContext();
                console.log('Existing context:', context);
                if (context.isAuthenticated) {
                    // If we have a valid session, return the current access token
                    const accessToken = await logtoClient.getAccessToken();
                    console.log('Existing access token:', accessToken);
                    return {
                        redirect_url: `${process.env.API_URL || 'http://localhost:4000'}/auth/callback?token=${accessToken}`
                    };
                }
            } catch (error) {
                // If getContext fails, we need to start a new login flow
                console.log('No valid session found, starting new login flow');
            }
            
            // Initiate the sign-in flow and return the callback URL
            await logtoClient.signIn(callbackUrl);
            return {
                redirect_url: callbackUrl
            };
        } catch (error) {
            console.error('Login failed:', error);
            throw APIError.internal(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
);

// Callback endpoint
export const callback = api(
    { method: "GET", path: "/auth/callback", expose: true },
    async ({ code, state }: { code?: string, state?: string }): Promise<{ access_token: string; user_id: string }> => {
        try {
            if (!code) {
                throw APIError.invalidArgument("Authorization code is required");
            }

            const logtoClient = createLogtoClient();
            console.log('Processing callback with code:', code);
            
            try {
                // Handle the callback and exchange code for tokens
                await logtoClient.handleSignInCallback(`${process.env.API_URL || 'http://localhost:4000'}/auth/callback?code=${code}&state=${state || ''}`);
                
                // Get and log token information
                const accessToken = await logtoClient.getAccessToken();
                const idToken = await logtoClient.getIdToken();
                
                console.log('Tokens received:', {
                    accessToken,
                    idToken
                });
                
                // Try to decode tokens
                for (const [tokenName, token] of [['Access Token', accessToken], ['ID Token', idToken]]) {
                    if (token) {
                        try {
                            const [, payload] = token.split('.');
                            if (payload) {
                                const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
                                console.log(`${tokenName} payload:`, decodedPayload);
                            }
                        } catch (error) {
                            console.log(`Error decoding ${tokenName}:`, error);
                        }
                    }
                }
            } catch (error) {
                // If session not found, redirect to login
                if (error instanceof Error && error.message.includes('Sign-in session not found')) {
                    await logtoClient.signIn(`${process.env.API_URL || 'http://localhost:4000'}/auth/callback`);
                    throw APIError.unauthenticated("Session expired, please login again");
                }
                throw error;
            }
            
            // Get user info after successful sign-in
            const userInfo = await logtoClient.fetchUserInfo();
            console.log('User info:', userInfo);

            if (!userInfo.sub) {
                throw APIError.internal("Failed to get user information");
            }

            // Get access token
            const accessToken = await logtoClient.getAccessToken();

            return { 
                access_token: accessToken,
                user_id: userInfo.sub
            };
        } catch (error) {
            console.error("Callback error:", error);
            throw APIError.internal(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
);

// Logout endpoint
export const logout = api(
    { method: "POST", path: "/auth/logout", expose: true },
    async (): Promise<void> => {
        try {
            const logtoClient = createLogtoClient();
            // Clear the session and sign out
            await logtoClient.signOut();
            // Redirect to Logto's logout page
            await logtoClient.signOut(`${process.env.API_URL || 'http://localhost:4000'}`);
        } catch (error) {
            console.error("Logout error:", error);
            throw APIError.internal("Logout failed");
        }
    }
);

// Get user info endpoint
export const getUserInfo = api(
    { method: "GET", path: "/auth/userinfo", expose: true },
    async ({ token }: { token: string }) => {
        try {
            const auth = await verifyLogtoAuth(token);
            return { userId: auth.userId, roles: auth.roles, scopes: auth.scopes };
        } catch (error) {
            console.error("Get user info error:", error);
            throw APIError.unauthenticated("Invalid token");
        }
    }
);