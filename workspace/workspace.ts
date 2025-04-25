import { db } from "../db";
import { api, APIError } from "encore.dev/api";
import { verifyLogtoAuth, checkScopes, checkRoles, isAdmin } from "../middleware/auth";

export interface Workspace {
  id: string; // Unique identifier for the workspace
  name: string; // Name of the workspace
}

export interface WorkspaceListResponse {
    workspaces: Workspace[];
}

export interface CurrentWorkspaceResponse {
    workspace: Workspace | null;
}

// Create a new workspace
export const createWorkspace = api(
  { method: "POST", path: "/workspace", expose: true },
  async ({ name, token }: { name: string, token: string }): Promise<Workspace> => {
    const auth = await verifyLogtoAuth(token);
    if (!isAdmin(auth)) {
      throw APIError.permissionDenied("Only admins can create workspaces");
    }
    console.log('User is admin:', true);

    const id = crypto.randomUUID();
    await db.exec`
      INSERT INTO workspace (id, name)
      VALUES (${id}, ${name})
    `;
    return { id, name };
  }
);

// List all workspaces
export const listWorkspaces = api(
  { method: "GET", path: "/workspaces", expose: true },
  async ({ token }: { token: string }): Promise<WorkspaceListResponse> => {
    const auth = await verifyLogtoAuth(token);
    const userRoles = checkRoles(auth, ['admin', 'user']);
    console.log('User is admin:', isAdmin(auth));
    console.log('User roles:', userRoles);

    const rows = [];
    for await (const row of db.query`
      SELECT id, name
      FROM workspace
    `) {
      rows.push(row);
    }
    return { workspaces: rows.map((row) => ({ id: row.id, name: row.name })) };
  }
);

export const setWorkspace = api(
    { method: "POST", path: "/workspace/set", expose: true },
    async ({ workspaceId, token }: { workspaceId: string, token: string }): Promise<{ success: boolean }> => {
        const auth = await verifyLogtoAuth(token);
        if (!isAdmin(auth)) {
          throw APIError.permissionDenied("Only admins can set workspaces");
        }
        console.log('User is admin:', true);

        // Validate that the workspace exists
        const row = await db.queryRow`
            SELECT id FROM workspace WHERE id = ${workspaceId}
        `;
        if (!row) {
            throw APIError.notFound(`Workspace with ID ${workspaceId} not found`);
        }

        await db.rawExec(`SELECT set_config('app.workspace_id', '${workspaceId}', false)`);
        return { success: true };
    }
);

export const getWorkspace = api(
    { method: "GET", path: "/workspace/:id", expose: true },
    async ({ id, token }: { id: string, token: string }): Promise<Workspace> => {
        const auth = await verifyLogtoAuth(token);
        const userRoles = checkRoles(auth, ['admin', 'user']);
        console.log('User is admin:', isAdmin(auth));
        console.log('User roles:', userRoles);

        const row = await db.queryRow`
            SELECT id, name
            FROM workspace
            WHERE id = ${id}
        `;
        if (!row) {
            throw APIError.notFound(`Workspace with ID ${id} not found`);
        }
        return { id: row.id, name: row.name };
    }
);

export const getCurrentWorkspace = api(
    { method: "GET", path: "/workspace/current", expose: true },
    async ({ token }: { token: string }): Promise<CurrentWorkspaceResponse> => {
        const auth = await verifyLogtoAuth(token);
        const userRoles = checkRoles(auth, ['admin', 'user']);
        console.log('User is admin:', isAdmin(auth));
        console.log('User roles:', userRoles);

        const currentId = await db.queryRow`
            SELECT current_setting('app.workspace_id', true) as current_workspace_id
        `;

        if (!currentId?.current_workspace_id) {
            return { workspace: null };
        }

        const workspace = await db.queryRow`
            SELECT id, name
            FROM workspace
            WHERE id = ${currentId.current_workspace_id}::uuid
        `;

        if (!workspace) {
            return { workspace: null };
        }

        return {
            workspace: {
                id: workspace.id,
                name: workspace.name,
            },
        };
    }
);