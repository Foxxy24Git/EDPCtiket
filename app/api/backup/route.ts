import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  listBackupFiles,
  performDatabaseBackup,
  checkAndRunMonthlyAutoBackup,
  getBackupDir,
} from "@/lib/autoBackup";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** GET /api/backup — Mendapatkan daftar backup atau mengunduh berkas backup tertentu. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Jalankan pengecekan backup bulanan secara pasif setiap ada request GET
  await checkAndRunMonthlyAutoBackup().catch(() => {});

  const url = new URL(req.url);
  const downloadFilename = url.searchParams.get("download");

  if (downloadFilename) {
    // Keamanan: cegah directory traversal
    const safeFilename = downloadFilename.replace(/[^a-zA-Z0-9_\-\.]/g, "");
    if (!safeFilename.endsWith(".sql") && !safeFilename.endsWith(".json")) {
      return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
    }

    try {
      const filePath = join(getBackupDir(), safeFilename);
      const content = await readFile(filePath);
      const contentType = safeFilename.endsWith(".json")
        ? "application/json"
        : "text/plain";

      return new NextResponse(content, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }
  }

  const files = await listBackupFiles();
  return NextResponse.json({ files });
}

/** POST /api/backup — Memicu backup database secara manual. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya Super Admin." }, { status: 403 });
  }

  try {
    const result = await performDatabaseBackup("manual");
    return NextResponse.json({
      ok: true,
      message: "Backup database berhasil dibuat.",
      filename: result.sqlFilename,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat backup." },
      { status: 500 }
    );
  }
}
