import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET /api/server-log/active-count — Hitung jumlah pengunjung aktif yang dicatat user ini */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ activeCount: 0 });
    }

    const count = await prisma.serverAccessLog.count({
      where: {
        catatanOleh: session.sub,
        waktuKeluar: null,
      },
    });

    return NextResponse.json({ activeCount: count });
  } catch (err) {
    console.error("[GET /api/server-log/active-count]", err);
    return NextResponse.json({ activeCount: 0 });
  }
}
