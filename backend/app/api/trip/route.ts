import { tripData } from "@/lib/trip-json";

/** The trip plan this deployment runs on (team and parents, proxy.ts), with its hash. */
export async function GET() {
  const { json, hash } = await tripData();
  return new Response(`{"hash":"${hash}","trip":${json}}`, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
