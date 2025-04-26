import { db } from "../db";
import { api, APIError } from "encore.dev/api";
import { verifyLogtoAuth, isAdmin } from "../middleware/auth";

// Associate a user with a workspace
export const associateUserWithWorkspace = api(
    { method: "POST", path: "/user/workspace", expose: true },
    async ({ userId, workspaceId, token }: { userId: string, workspaceId: string, token: string }): Promise<{ success: boolean }> => {
        console.log('Starting associateUserWithWorkspace with params:', {
            userId,
            workspaceId,
            tokenLength: token?.length
        });

        const auth = await verifyLogtoAuth(token);
        if (!isAdmin(auth)) {
            throw APIError.permissionDenied("Only admins can associate users with workspaces");
        }

        try {
            console.log('Verifying workspace with ID:', workspaceId);
            // Verify the workspace exists and get its UUID
            const workspace = await db.queryRow`
                SELECT id::text as id FROM workspace WHERE id = ${workspaceId}::uuid
            `;
            console.log('Workspace query result:', workspace);

            if (!workspace) {
                console.log('Workspace not found:', workspaceId);
                throw APIError.notFound(`Workspace with ID ${workspaceId} not found`);
            }

            console.log('Checking if user exists:', userId);
            // Check if user exists
            const user = await db.queryRow`
                SELECT id FROM users WHERE id = ${userId}
            `;
            console.log('User query result:', user);

            if (!user) {
                console.log('Creating new user with workspace:', {
                    userId,
                    workspaceId: workspace.id
                });
                // Create new user with workspace
                await db.exec`
                    INSERT INTO users (id, workspace_id)
                    VALUES (${userId}, ${workspace.id})
                `;
            } else {
                console.log('Updating existing user with workspace:', {
                    userId,
                    workspaceId: workspace.id
                });
                // Update existing user's workspace
                await db.exec`
                    UPDATE users 
                    SET workspace_id = ${workspace.id}
                    WHERE id = ${userId}
                `;
            }

            console.log('Successfully associated user with workspace');
            return { success: true };
        } catch (error) {
            console.error('Error in associateUserWithWorkspace:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                workspaceId,
                userId
            });

            if (error instanceof Error && error.message.includes('invalid input syntax for type uuid')) {
                throw APIError.invalidArgument(`Invalid workspace ID format: ${workspaceId}`);
            }
            throw error;
        }
    }
);

// Get user's workspace
export const getUserWorkspace = api(
    { method: "GET", path: "/user/workspace", expose: true },
    async ({ userId, token }: { userId: string, token: string }): Promise<{ workspaceId: string | null }> => {
        console.log('Getting workspace for user:', userId);
        const auth = await verifyLogtoAuth(token);
        if (!isAdmin(auth)) {
            throw APIError.permissionDenied("Only admins can view user workspaces");
        }

        const user = await db.queryRow`
            SELECT workspace_id::text as workspace_id FROM users WHERE id = ${userId}
        `;
        console.log('User workspace query result:', user);

        return { workspaceId: user?.workspace_id || null };
    }
); 