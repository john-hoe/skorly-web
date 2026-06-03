import { json } from "@/lib/api/http";
import { getRuntimeGroupedTeams } from "@/lib/runtime-data";

export async function GET() {
  const groups = await getRuntimeGroupedTeams().catch(() => []);
  return json(groups);
}
