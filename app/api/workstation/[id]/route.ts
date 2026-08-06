import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function optStr(v: unknown): string | null {
  const s = cleanStr(v);
  return s.length ? s : null;
}

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/workstation/[id] — ubah data cabang workstation. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role === "supervisi") {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const namaCabang = cleanStr(body?.namaCabang);
  if (!namaCabang) {
    return NextResponse.json(
      { error: "Nama Cabang wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.workstationMaster.update({
      where: { id },
      data: {
        namaCabang,
        kodeKantor: optStr(body?.kodeKantor),
        lokasiKantor: optStr(body?.lokasiKantor),
      },
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: `Kode kantor "${optStr(body?.kodeKantor)}" sudah terdaftar.` },
          { status: 409 }
        );
      }
      if (e.code === "P2025") {
        return NextResponse.json(
          { error: "Data cabang tidak ditemukan." },
          { status: 404 }
        );
      }
    }
    throw e;
  }
}

/** DELETE /api/workstation/[id] — hapus data cabang workstation. */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role === "supervisi") {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }
  const { id } = await params;

  try {
    await prisma.workstationMaster.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Data cabang tidak ditemukan." },
        { status: 404 }
      );
    }
    throw e;
  }
}
