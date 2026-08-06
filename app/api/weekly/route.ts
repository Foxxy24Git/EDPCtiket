import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { countWeeklyTickets, listWorkstationWeeklyTickets } from "@/lib/ticketQueries";
import { resolveRange } from "@/lib/weeklyRange";

/**
 * GET /api/weekly — daftar tiket Weekly Monitoring workstation.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const { from, to, fromKey, toKey } = resolveRange(
    sp.get("from"),
    sp.get("to")
  );

  const [items, total] = await Promise.all([
    listWorkstationWeeklyTickets({
      from,
      to,
      cabang: sp.get("cabang"),
      status: sp.get("status"),
      search: sp.get("search"),
    }),
    countWeeklyTickets({ from, to }),
  ]);

  return NextResponse.json({ items, total, from: fromKey, to: toKey });
}
