import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: number | ResponseInit): NextResponse {
  return NextResponse.json({ data }, typeof init === "number" ? { status: init } : init);
}

export function fail(status: number, message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: { message, details } }, { status });
}
