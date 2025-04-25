import { api, APIError } from "encore.dev/api";
import { logtoConfig, createLogtoClient } from './logto-config';

// Login endpoint
export const login = api(
    { method: "GET", path: "/auth/login", expose: true },
    async (): Promise<void> => {
        try {
            const logtoClient = createLogtoClient();
            const callbackUrl = `${process.env.API_URL || 'http://localhost:4000'}/auth/callback`;
                       
            // Initiate the sign-in flow
            await logtoClient.signIn(callbackUrl);
        } catch (error) {
            console.error('Login failed:', error);
            throw APIError.internal(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
);

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token?: string;
    scope?: string;
}

// Callback endpoint
export const callback = api(
    { method: "GET", path: "/auth/callback", expose: true },
    async ({ code, state }: { code?: string, state?: string }): Promise<{ access_token: string; user_id: string }> => {
        try {
            if (!code) {
                throw APIError.invalidArgument("Authorization code is required");
            }

            const logtoClient = createLogtoClient();
            
            try {
                // Handle the callback and exchange code for tokens
                await logtoClient.handleSignInCallback(`${process.env.API_URL || 'http://localhost:4000'}/auth/callback?code=${code}&state=${state || ''}`);
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
            const logtoClient = createLogtoClient();
            const userInfo = await logtoClient.fetchUserInfo();
            return userInfo;
        } catch (error) {
            console.error("Get user info error:", error);
            throw APIError.unauthenticated("Invalid token");
        }
    }
);