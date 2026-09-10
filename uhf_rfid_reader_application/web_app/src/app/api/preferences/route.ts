import { z } from "zod";
import { withApiMiddleware } from "@/server/http/withApiMiddleware";
import { ok, fail } from "@/server/http/respond";
import { updateUserPreferences } from "@/server/services/preferences/userPreferences";

const patchSchema = z.object({
  themePalette: z.string().optional(),
  themeMode: z.string().optional(),
  fontFamily: z.string().optional(),
});

/** Every signed-in user may edit their own theme preference — no module permission gate needed. */
export const PATCH = withApiMiddleware(
  async (req, _ctx, { user }) => {
    if (!user) return fail(401, "Sign in required.");
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Invalid preferences payload.", parsed.error.flatten());

    await updateUserPreferences(user.id, parsed.data);
    return ok({ saved: true });
  },
  { rateLimit: { points: 30, durationSeconds: 60 } },
);
