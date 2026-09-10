import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { updateRolePermission } from "@/server/services/permissions/updateRolePermission";
import { MODULE_KEYS } from "@/server/permissions/modules";

const patchSchema = z.object({
  moduleKey: z.enum(MODULE_KEYS),
  actions: z.array(z.string()),
});

export const PATCH = withApiMiddleware<{ roleId: string }>(
  async (req, ctx) => {
    const { roleId } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid permission payload.", parsed.error.flatten());

    await updateRolePermission(roleId, parsed.data.moduleKey, parsed.data.actions);
    return ok({ saved: true });
  },
  {
    rateLimit: { points: 60, durationSeconds: 60 },
    permission: { module: "permissionMatrix", action: "update" },
  },
);
