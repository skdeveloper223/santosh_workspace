import "server-only";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type CreateReaderInput = {
  name: string;
  ipAddress: string;
  port: number;
  locationType: string;
  attachTo: { kind: "gate" | "checkpoint"; id: string };
};

export async function createReader(input: CreateReaderInput): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from("uhfReaders")
    .insert({
      name: input.name,
      ipAddress: input.ipAddress,
      port: input.port,
      locationType: input.locationType,
      gateId: input.attachTo.kind === "gate" ? input.attachTo.id : null,
      checkpointId: input.attachTo.kind === "checkpoint" ? input.attachTo.id : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createReader: ${error.message}`);
  return { id: data.id as string };
}

export async function deleteReader(readerId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("uhfReaders").delete().eq("id", readerId);
  if (error) throw new Error(`deleteReader: ${error.message}`);
}
