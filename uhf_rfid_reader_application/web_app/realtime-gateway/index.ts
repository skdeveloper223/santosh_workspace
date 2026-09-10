// `dotenv/config` on its own only loads ".env" — this project (like Next.js
// itself) keeps real values in ".env.local" instead, so both are loaded
// explicitly here, in Next's own precedence order (.env.local wins).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { startRealtimeGateway } from "../src/server/realtime/gateway";

const port = Number(process.env.REALTIME_GATEWAY_PORT ?? 9010);
startRealtimeGateway({ port });
