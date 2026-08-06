import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET /api/server-log/pics — Daftar nama user untuk autocomplete PIC */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { isAktif: true },
      select: { nama: true },
      orderBy: { nama: "asc" },
    });

    const names = users.map((u) => u.nama);
    return NextResponse.json({ names });
  } catch (err) {
    console.error("[GET /api/server-log/pics]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memuat data PIC." },
      { status: 500 }
    );
  }
}
