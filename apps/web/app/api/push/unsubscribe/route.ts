import { json, readJson } from "@/lib/api/http";
import { deleteRuntimePushSubscription } from "@/lib/runtime-data";

type UnsubscribeBody = {
  endpoint?: string;
};

export async function POST(request: Request) {
  const input = await readJson<UnsubscribeBody>(request);
  if (!input?.endpoint) return json({ ok: false }, { status: 400 });

  try {
    await deleteRuntimePushSubscription(input.endpoint);
    return json({ ok: true });
  } catch {
    return json({ ok: false });
  }
}
