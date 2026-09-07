import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/pc-inventory/[id]
 * Update entri SN perangkat (hanya superadmin)
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya superadmin yang dapat mengubah data." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  try {
    const existing = await prisma.pcInventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    }

    // Jika SN diubah, cek duplikasi
    if (body.sn && body.sn.trim().toUpperCase() !== existing.sn) {
      const dup = await prisma.pcInventory.findUnique({
        where: { sn: body.sn.trim().toUpperCase() },
      });
      if (dup) {
        return NextResponse.json({ error: `SN '${body.sn.trim().toUpperCase()}' sudah ada.` }, { status: 409 });
      }
    }

    const item = await prisma.pcInventory.update({
      where: { id },
      data: {
        sn:     body.sn     ? body.sn.trim().toUpperCase() : existing.sn,
        merek:  "merek"  in body ? (body.merek  ? body.merek.trim()  : null) : existing.merek,
        jenis:  "jenis"  in body ? (body.jenis  ? body.jenis.trim()  : null) : existing.jenis,
        lokasi: "lokasi" in body ? (body.lokasi ? body.lokasi.trim() : null) : existing.lokasi,
        cabang: "cabang" in body ? (body.cabang ? body.cabang.trim() : null) : existing.cabang,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("Gagal update pc_inventory:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

/**
 * DELETE /api/pc-inventory/[id]
 * Hapus entri SN perangkat (hanya superadmin)
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya superadmin yang dapat menghapus data." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.pcInventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    }

    await prisma.pcInventory.update({
      where: { id },
      data: { isTerminated: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal hapus pc_inventory:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
