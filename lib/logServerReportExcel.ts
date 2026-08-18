import ExcelJS from "exceljs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FONT = "Swis721 Lt BT";
const BLACK = "FF000000";
const HEADER_FILL = "FF83CAFF"; 
const STRIPE_FILL = "FFF7FAFC"; 

const THIN = { style: "thin" as const, color: { argb: BLACK } };
const ALL_BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function font(opts: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> {
  return { name: FONT, color: { argb: BLACK }, ...opts };
}

export interface LogServerReportRow {
  no: number;
  fotoUrl?: string | null;
  namaOrang: string;
  instansi: string;
  namaPic: string;
  keperluan: string;
  waktuMasuk: string;
  waktuKeluar: string;
  pencatatNama: string;
  statusApproval: string;
  approverNama: string;
}

interface ColDef {
  col: string;
  header: string;
  width: number;
  left?: boolean;
  get: (r: LogServerReportRow) => string | number | null;
}

const COLUMNS: ColDef[] = [
  { col: "A", header: "No", width: 5, get: (r) => r.no },
  { col: "B", header: "Foto", width: 14, get: () => "" },
  { col: "C", header: "Nama Pengunjung", width: 25, left: true, get: (r) => r.namaOrang },
  { col: "D", header: "Instansi / Perusahaan", width: 22, left: true, get: (r) => r.instansi },
  { col: "E", header: "PIC Pendamping", width: 22, left: true, get: (r) => r.namaPic },
  { col: "F", header: "Keperluan", width: 28, left: true, get: (r) => r.keperluan },
  { col: "G", header: "Waktu Masuk", width: 20, get: (r) => r.waktuMasuk },
  { col: "H", header: "Waktu Keluar", width: 20, get: (r) => r.waktuKeluar },
  { col: "I", header: "Dicatat Oleh", width: 20, left: true, get: (r) => r.pencatatNama },
  { col: "J", header: "Status Approval", width: 16, get: (r) => r.statusApproval },
  { col: "K", header: "Nama Supervisi", width: 22, left: true, get: (r) => r.approverNama },
];

function getImageBufferAndExtension(fotoUrl: string | null | undefined): { buffer: Buffer; extension: "png" | "jpeg" } | null {
  if (!fotoUrl) return null;
  try {
    if (fotoUrl.startsWith("data:image/")) {
      const match = fotoUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (match) {
        const ext = match[1] === "png" ? "png" : "jpeg";
        const buffer = Buffer.from(match[2], "base64");
        return { buffer, extension: ext };
      }
    } else {
      let relPath = fotoUrl;
      if (relPath.startsWith("/api/uploads/")) {
        relPath = relPath.replace("/api/uploads/", "uploads/");
      } else if (relPath.startsWith("/uploads/")) {
        relPath = relPath.replace("/uploads/", "uploads/");
      }
      const fullPath = join(process.cwd(), "public", relPath);
      if (existsSync(fullPath)) {
        const buffer = readFileSync(fullPath);
        const lower = fullPath.toLowerCase();
        const extension = lower.endsWith(".png") ? "png" : "jpeg";
        return { buffer, extension };
      }
    }
  } catch (e) {
    console.error("Gagal membaca foto pengunjung untuk Excel:", e);
  }
  return null;
}

export async function buildLogServerWorkbook(
  logs: LogServerReportRow[],
  dateRangeLabel: string,
  logoPath?: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "fq-Report";
  wb.created = new Date();

  const ws = wb.addWorksheet("Rekap Log Server", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
    properties: { defaultRowHeight: 15 },
  });

  for (const c of COLUMNS) ws.getColumn(c.col).width = c.width;
  ws.properties.defaultColWidth = 12;

  // Row heights for logo space
  ws.getRow(1).height = 18;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 18;

  const realLogoPath = logoPath ?? join(process.cwd(), "public", "logo-bank-nagari.png");
  if (existsSync(realLogoPath)) {
    const logoImg = wb.addImage({
      buffer: readFileSync(realLogoPath) as unknown as ArrayBuffer,
      extension: "png",
    });
    ws.addImage(logoImg, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 110, height: 60 },
    });
  }

  // --- Title & Metadata ---
  const rTitle = ws.getRow(2);
  rTitle.getCell("D").value = "LAPORAN REKAPAN AKSES KELUAR MASUK RUANG SERVER";
  rTitle.getCell("D").font = font({ size: 14, bold: true });

  const rSubtitle = ws.getRow(3);
  rSubtitle.getCell("D").value = `Periode / Rentang Waktu: ${dateRangeLabel}`;
  rSubtitle.getCell("D").font = font({ size: 10, italic: true });

  // Space row
  ws.getRow(5).height = 10;

  // --- Table Headers ---
  const rHeader = ws.getRow(6);
  rHeader.height = 24;
  for (const colDef of COLUMNS) {
    const cell = rHeader.getCell(colDef.col);
    cell.value = colDef.header;
    cell.font = font({ bold: true, size: 9.5 });
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = ALL_BORDERS;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
  }

function estimateCellLines(val: unknown, colWidth: number): number {
  if (val === null || val === undefined) return 1;
  const str = String(val);
  if (!str) return 1;

  const lines = str.split(/\r?\n/);
  let totalLines = 0;

  for (const line of lines) {
    if (!line) {
      totalLines += 1;
      continue;
    }
    const effectiveWidth = Math.max(1, colWidth - 2);
    const wrapped = Math.ceil(line.length / effectiveWidth);
    totalLines += Math.max(1, wrapped);
  }

  return Math.max(1, totalLines);
}

  // --- Data Rows ---
  let rowIdx = 7;
  for (const log of logs) {
    const row = ws.getRow(rowIdx);
    const imgData = getImageBufferAndExtension(log.fotoUrl);

    let maxLines = 1;
    for (const colDef of COLUMNS) {
      const val = colDef.get(log);
      const lines = estimateCellLines(val, colDef.width);
      if (lines > maxLines) maxLines = lines;
    }

    const calculatedHeight = Math.max(24, maxLines * 16 + 8);
    row.height = imgData ? Math.max(48, calculatedHeight) : calculatedHeight;

    const isStripe = rowIdx % 2 === 0;

    for (const colDef of COLUMNS) {
      const cell = row.getCell(colDef.col);
      const val = colDef.get(log);
      cell.value = val;
      cell.font = font({ size: 9 });
      cell.border = ALL_BORDERS;
      cell.alignment = {
        horizontal: colDef.left ? "left" : "center",
        vertical: "middle",
        wrapText: true,
      };

      if (isStripe) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STRIPE_FILL },
        };
      }
    }

    if (imgData) {
      const imgId = wb.addImage({
        buffer: imgData.buffer as unknown as ArrayBuffer,
        extension: imgData.extension,
      });
      ws.addImage(imgId, {
        tl: { col: 1.1, row: rowIdx - 1 + 0.05 },
        ext: { width: 40, height: 40 },
      });
    }

    rowIdx++;
  }

  const result = await wb.xlsx.writeBuffer();
  return Buffer.from(result as ArrayBuffer) as unknown as Buffer;
}
