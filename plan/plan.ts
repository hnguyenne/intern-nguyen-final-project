import { db } from "../db";
import { api, APIError } from "encore.dev/api";
import { authenticateJWT } from "../middleware";

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
  async ({ planName }: { planName: string }): Promise<Plan> => {
    const id = crypto.randomUUID();
    const currentWorkspaceId = await db.queryRow`
    SELECT current_setting('app.workspace_id', true) as workspace_id
    `;
    await db.exec`
      INSERT INTO plan (id, workspace_id, plan_name)
      VALUES (${id}, (current_setting('app.workspace_id'))::uuid, ${planName})
    `;
    return { id, workspaceId: currentWorkspaceId?.workspace_id, planName };
  }
);

export const getPlan = api(
  { method: "GET", path: "/plan/:id", expose: true },
  async ({ id }: { id: string }): Promise<Plan> => {
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
  async (): Promise<PlanListResponse> => {
    const rows = [];
    for await (const row of db.query`
      SELECT id, workspace_id, plan_name
      FROM plan
    `) {
      rows.push(row);
    }
    return { plans: rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      planName: row.plan_name,
    })) };
  }
);