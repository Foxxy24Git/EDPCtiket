import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("sn");

  if (!sn || sn.trim().length < 3) {
    return NextResponse.json({ error: "SN tidak valid atau terlalu pendek." }, { status: 400 });
  }

  try {
    const historyTicket = await prisma.ticket.findFirst({
      where: {
        kategori: "workstation",
        wsSnKomputer: {
          equals: sn.trim(),
          mode: "insensitive"
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        wsCabang: true,
        wsCapem: true,
        wsMerekKomputer: true
      }
    });

    if (!historyTicket) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      data: {
        cabang: historyTicket.wsCabang,
        capem: historyTicket.wsCapem,
        merek: historyTicket.wsMerekKomputer
      }
    });

  } catch (error) {
    console.error("Gagal mencari riwayat SN:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
