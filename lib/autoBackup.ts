import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

export interface BackupFileInfo {
  filename: string;
  size: number; // in bytes
  createdAt: string;
  isMonthlyAuto: boolean;
}

const BACKUP_DIR_NAME = "backup_db";

export function getBackupDir(): string {
  return join(process.cwd(), BACKUP_DIR_NAME);
}

/** Memastikan folder backup_db ada. */
export async function ensureBackupDirExists(): Promise<string> {
  const dir = getBackupDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Mengamankan string SQL dari SQL injection sederhana untuk backup export */
function escapeSqlString(val: string): string {
  return `'${val.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

/** Mengonversi nilai JS ke format SQL literal */
function toSqlValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return escapeSqlString(val.toISOString());
  if (typeof val === "object") return escapeSqlString(JSON.stringify(val));
  return escapeSqlString(String(val));
}

/**
 * Membuat backup dataset lengkap (JSON & SQL Insert Script) dari Prisma.
 * Jika pg_dump tersedia di sistem host/container, pg_dump juga akan digunakan.
 */
export async function performDatabaseBackup(label?: string): Promise<{
  sqlFilename: string;
  jsonFilename: string;
  sqlPath: string;
  jsonPath: string;
}> {
  const dir = await ensureBackupDirExists();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
  const tag = label ? `_${label}` : "";

  const baseName = `backup_fq_db_${dateStr}_${timeStr}${tag}`;
  const sqlFilename = `${baseName}.sql`;
  const jsonFilename = `${baseName}.json`;
  const sqlPath = join(dir, sqlFilename);
  const jsonPath = join(dir, jsonFilename);

  // 1. Ambil seluruh data dari Prisma
  const [users, branches, tickets, activities, serverLogs] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.workstationMaster.findMany(),
      prisma.ticket.findMany(),
      prisma.ticketActivity.findMany(),
      prisma.serverAccessLog.findMany(),
    ]);

  // Safety Check: Jika database dalam keadaan kosong total / ter-reset tanpa data user, batalkan auto-backup
  if (users.length === 0) {
    throw new Error(
      "[Backup System] Gagal membuat backup: Database terindikasi kosong (0 user). Backup dibatalkan untuk melindungi riwayat backup terdahulu."
    );
  }

  const fullDataset = {
    meta: {
      appName: "EDPCtiket Bank Nagari",
      backupDate: now.toISOString(),
      version: "1.0",
      tables: {
        users: users.length,
        workstationMaster: branches.length,
        tickets: tickets.length,
        ticketActivities: activities.length,
        serverAccessLog: serverLogs.length,
      },
    },
    data: {
      users,
      workstationMaster: branches,
      tickets,
      ticketActivities: activities,
      serverAccessLog: serverLogs,
    },
  };

  // Simpan JSON dataset
  await writeFile(jsonPath, JSON.stringify(fullDataset, null, 2), "utf-8");

  // 2. Generate SQL Dump script
  let sqlContent = `-- ========================================================\n`;
  sqlContent += `-- BACKUP DATASET DATABASE EDPCtikets - BANK NAGARI\n`;
  sqlContent += `-- Tanggal Backup: ${now.toLocaleString("id-ID")}\n`;
  sqlContent += `-- ========================================================\n\n`;

  // Coba jalankan pg_dump jika tersedia di container/environment
  const dbUrl = process.env.DATABASE_URL;
  let pgDumpSuccess = false;
  if (dbUrl) {
    try {
      const dumpCmd = `pg_dump "${dbUrl}" --clean --if-exists`;
      const { stdout } = await execAsync(dumpCmd, { maxBuffer: 10 * 1024 * 1024 });
      if (stdout && stdout.length > 100) {
        await writeFile(sqlPath, stdout, "utf-8");
        pgDumpSuccess = true;
      }
    } catch {
      // Fallback ke Prisma SQL generator jika pg_dump tidak terinstall
      pgDumpSuccess = false;
    }
  }

  if (!pgDumpSuccess) {
    // Generate SQL Insert Statements manual
    const generateInserts = (tableName: string, rows: Record<string, unknown>[]) => {
      if (rows.length === 0) return `-- Tabel ${tableName}: kosong\n\n`;
      let str = `-- Table: ${tableName} (${rows.length} rows)\n`;
      for (const row of rows) {
        const keys = Object.keys(row);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const vals = keys.map((k) => toSqlValue(row[k])).join(", ");
        str += `INSERT INTO "${tableName}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
      }
      return str + "\n";
    };

    sqlContent += generateInserts("users", users as unknown as Record<string, unknown>[]);
    sqlContent += generateInserts("workstation_master", branches as unknown as Record<string, unknown>[]);
    sqlContent += generateInserts("tickets", tickets as unknown as Record<string, unknown>[]);
    sqlContent += generateInserts("ticket_activities", activities as unknown as Record<string, unknown>[]);
    sqlContent += generateInserts("server_access_logs", serverLogs as unknown as Record<string, unknown>[]);

    await writeFile(sqlPath, sqlContent, "utf-8");
  }

  console.log(`[Backup System] Berhasil membuat backup database: ${sqlFilename}`);

  return {
    sqlFilename,
    jsonFilename,
    sqlPath,
    jsonPath,
  };
}

/**
 * Memeriksa apakah backup bulanan untuk bulan ini (YYYY-MM) sudah ada.
 * Jika belum ada, otomatis buat backup bulanan baru di folder backup_db/.
 */
export async function checkAndRunMonthlyAutoBackup(): Promise<boolean> {
  try {
    const dir = await ensureBackupDirExists();
    const files = await readdir(dir).catch(() => []);

    const now = new Date();
    const currentMonthPattern = `backup_fq_db_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthBackupExists = files.some((f) => f.startsWith(currentMonthPattern) || f.startsWith(`backup_its_db_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`));
    if (!monthBackupExists) {
      console.log(`[Auto-Backup] Menjalankan backup otomatis bulanan (${currentMonthPattern})...`);
      await performDatabaseBackup(`auto_monthly`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Auto-Backup] Gagal mengeksekusi backup otomatis bulanan:", err);
    return false;
  }
}

/** Membaca daftar berkas backup yang tersimpan di folder backup_db/ */
export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  const dir = await ensureBackupDirExists();
  const files = await readdir(dir).catch(() => []);

  const result: BackupFileInfo[] = [];
  for (const f of files) {
    if (f.endsWith(".sql") || f.endsWith(".json")) {
      const filePath = join(dir, f);
      const st = await stat(filePath).catch(() => null);
      if (st) {
        result.push({
          filename: f,
          size: st.size,
          createdAt: st.mtime.toISOString(),
          isMonthlyAuto: f.includes("auto_monthly"),
        });
      }
    }
  }

  // Urutkan dari yang paling baru
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
