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

  const snClean = sn.trim();

  try {
    // 1. Cari di riwayat tiket (prioritas utama — data terbaru dari tiket nyata)
    const historyTicket = await prisma.ticket.findFirst({
      where: {
        kategori: "workstation",
        isTerminated: false,
        wsSnKomputer: {
          equals: snClean,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        wsCabang: true,
        wsCapem: true,
        wsMerekKomputer: true,
      },
    });

    if (historyTicket) {
      return NextResponse.json({
        found: true,
        source: "ticket",
        data: {
          cabang: historyTicket.wsCabang,
          capem: historyTicket.wsCapem,
          merek: historyTicket.wsMerekKomputer,
        },
      });
    }

    // 2. Fallback: cari di pc_inventory (data dari Excel / master SN)
    const inventoryItem = await prisma.pcInventory.findFirst({
      where: {
        isTerminated: false,
        sn: {
          equals: snClean,
          mode: "insensitive",
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json({ found: false });
    }

    // Format merek dari pc_inventory ke format yang dipahami WorkstationForm
    // Format: "[Komputer - Desktop] Lenovo" atau "[Komputer - All in One] HP"
    let formattedMerek: string | null = null;
    if (inventoryItem.merek || inventoryItem.jenis) {
      const jenisPc = inventoryItem.jenis ?? "";
      const merekPc = inventoryItem.merek ?? "";

      if (jenisPc && merekPc) {
        formattedMerek = `[Komputer - ${jenisPc}] ${merekPc}`;
      } else if (merekPc) {
        formattedMerek = `[Komputer] ${merekPc}`;
      } else if (jenisPc) {
        formattedMerek = `[Komputer - ${jenisPc}]`;
      }
    }

    return NextResponse.json({
      found: true,
      source: "inventory",
      data: {
        cabang: inventoryItem.cabang ?? null,
        capem: null,
        merek: formattedMerek,
      },
    });
  } catch (error) {
    console.error("Gagal mencari riwayat SN:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
