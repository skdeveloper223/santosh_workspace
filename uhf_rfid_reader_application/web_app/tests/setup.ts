import "@testing-library/jest-dom";
import { vi } from "vitest";
import { config as loadEnv } from "dotenv";

// Load environment variables for API tests
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = "https://example.supabase.co";
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key";
}

// Mock server-only module for unit tests
vi.mock("server-only", () => ({}));

// Mock Next.js headers / cookies for unit tests
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

// Mock resolveApiUser for unit testing API routes with valid UUID user context
vi.mock("@/server/auth/resolveApiUser", () => ({
  resolveApiUser: vi.fn().mockResolvedValue({
    id: "00000000-0000-0000-0000-000000000001",
    companyId: "00000000-0000-0000-0000-000000000001",
    roleName: "master_admin",
  }),
}));

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// Mock Supabase browser client
vi.mock("@/server/db/supabaseBrowser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));
