import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type DetectionItem = {
  id: string;
  epc: string;
  readerName: string | null;
  signal: number | null;
  detectedAt: string;
};

/** Live feed for the Tag Detection Monitor screen (§8.5) — ported logic from `UHF Python`'s TagService (§1). */
export async function listRecentDetections(limit = 50): Promise<DetectionItem[]> {
  const { data, error } = await supabaseAdmin
    .from("tagDetections")
    .select("id, epc, signal, detectedAt, uhfReaders(name)")
    .order("detectedAt", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRecentDetections: ${error.message}`);

  return (data ?? []).map((row) => {
    const reader = row.uhfReaders as unknown as { name: string } | { name: string }[] | null;
    return {
      id: row.id as string,
      epc: row.epc as string,
      signal: row.signal as number | null,
      detectedAt: row.detectedAt as string,
      readerName: Array.isArray(reader) ? (reader[0]?.name ?? null) : (reader?.name ?? null),
    };
  });
}
