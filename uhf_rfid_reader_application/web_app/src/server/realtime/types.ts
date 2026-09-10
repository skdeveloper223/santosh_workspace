/** §7.9 tasks 1–2 — the room hierarchy every realtime client subscribes into. */
export type RealtimeScope = "company" | "site" | "gate" | "reader" | "camera";

export type FanoutTarget = { scope: RealtimeScope; id: string };

/** One physical event, published once, fanned out to every room it belongs to. */
export type FanoutMessage = {
  event: string;
  targets: FanoutTarget[];
  payload: unknown;
};

export type RealtimeIdentity = {
  userId: string;
  companyId: string;
  roleNames: string[];
};
