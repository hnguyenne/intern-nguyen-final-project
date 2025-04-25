import { api, APIError } from "encore.dev/api";
import { verifyLogtoAuth } from "../middleware";

export interface LogtoTestResponse {
    success: boolean;
    connection: {
        logtoEndpoint: string | undefined;
        apiResource: string | undefined;
    };
    auth?: {
        userId: string | undefined;  // Allow undefined
        scopes: string[];
    };
}
export const testLogtoConnection = api(
    { method: "GET", path: "/test-logto", expose: true },
    async ({ token }: { token: string }): Promise<LogtoTestResponse> => {
        try {
            // Check environment variables
            const connection = {
                logtoEndpoint: process.env.LOGTO_ENDPOINT,
                apiResource: process.env.API_RESOURCE
            };

            // If no token provided, just return connection info
            if (!token) {
                return {
                    success: false,
                    connection,
                };
            }

            // Verify token and get auth info
            const auth = await verifyLogtoAuth(token);

            return {
                success: true,
                connection,
                auth
            };
        } catch (error) {
            console.error("Logto test error:", error);
            throw APIError.internal(`Logto connection test failed: ${(error as Error).message}`);
        }
    }
);

// Test without authentication required
export const getLogtoConfig = api(
    { method: "GET", path: "/logto-config", expose: true },
    async (): Promise<{
        endpoint: string | undefined;
        resource: string | undefined;
    }> => {
        return {
            endpoint: process.env.LOGTO_ENDPOINT,
            resource: process.env.API_RESOURCE
        };
    }
);