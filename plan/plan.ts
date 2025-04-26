import { db } from "../db";
import { api, APIError } from "encore.dev/api";
import { verifyLogtoAuth, checkRoles, isAdmin } from "../middleware/auth";

export interface Plan {
  id: string; // Unique identifier for the plan
  workspaceId: string; // Identifier for the associated workspace
  planName: string; // Name of the plan, up to 255 characters
}

export interface PlanListResponse {
  plans: Plan[];
}

export const createPlan = api(
  { method: "POST", path: "/plan", expose: true },
  async ({ planName, token }: { planName: string, token: string }): Promise<Plan> => {
    const auth = await verifyLogtoAuth(token);
    if (!isAdmin(auth)) {
      throw APIError.permissionDenied("Only admins can create plans");
    }
    console.log('User is admin:', true);

    const id = crypto.randomUUID();
    const currentWorkspaceId = await db.queryRow`
      SELECT current_setting('app.workspace_id', true) as workspace_id
    `;
    
    if (!currentWorkspaceId?.workspace_id) {
      throw APIError.invalidArgument("No workspace selected");
    }

    await db.exec`
      INSERT INTO plan (id, workspace_id, plan_name)
      VALUES (${id}, (current_setting('app.workspace_id'))::uuid, ${planName})
    `;
    return { id, workspaceId: currentWorkspaceId.workspace_id, planName };
  }
);

export const getPlan = api(
  { method: "GET", path: "/plan/:id", expose: true },
  async ({ id, token }: { id: string, token: string }): Promise<Plan> => {
    const auth = await verifyLogtoAuth(token);
    const userRoles = checkRoles(auth, ['admin', 'user']);
    console.log('User is admin:', isAdmin(auth));
    console.log('User roles:', userRoles);

    const row = await db.queryRow`
      SELECT id, workspace_id, plan_name
      FROM plan
      WHERE id = ${id}
    `;
    if (!row) {
      throw APIError.notFound(`Plan with ID ${id} not found`);
    }
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      planName: row.plan_name,
    };
  }
);

export const listPlans = api(
  { method: "GET", path: "/plans", expose: true },
  async ({ token }: { token: string }): Promise<PlanListResponse> => {
    const auth = await verifyLogtoAuth(token);
    const userId = auth.userId;
    const userRoles = checkRoles(auth, ['admin', 'user']);
    console.log('User roles:', userRoles);


    const userWorkspace = await db.queryRow`
        SELECT workspace_id
        FROM users
        WHERE id = ${userId}
    `;
    console.log('User workspace ID:', userWorkspace);

    if (!userWorkspace?.workspace_id) {
      throw APIError.invalidArgument("No workspace associated with the user");
    }

    await db.rawExec(`SELECT set_config('app.workspace_id', '${userWorkspace.workspace_id}', false)`);
    console.log('Workspace ID set to:', userWorkspace.workspace_id);


    const rows = [];
    for await (const row of db.query`
      SELECT id, workspace_id, plan_name
      FROM plan
          `) {
      console.log('Fetched plan row:', row);
      rows.push(row);
    }

    return { plans: rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      planName: row.plan_name,
    })) };
  }
);