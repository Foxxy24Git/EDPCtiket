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

export interface WorkstationReportRow {
  no: number;
  noTiket: string;
  wsCabang: string;
  wsCapem: string;
  wsTanggalMasuk: string;
  wsNoSurat: string;
  wsMerekKomputer: string;
  wsKelengkapan: string;
  wsSnKomputer: string;
  wsKerusakan: string;
  wsTglKeVendor: string;
  wsVendor: string;
  wsTglSelesaiVendor: string;
  wsTglKembaliKeCabang: string;
  wsPicTerima: string;
  status: string;
  statusSupervisi: string;
  keterangan: string;
}

interface ColDef {
  col: string;
  header: string;
  width: number;
  left?: boolean;
  get: (r: WorkstationReportRow) => string | number | null;
}

const COLUMNS: ColDef[] = [
  { col: "A", header: "No", width: 4.5, get: (r) => r.no },
  { col: "B", header: "No Tiket", width: 16, get: (r) => r.noTiket },
  { col: "C", header: "Cabang", width: 18, left: true, get: (r) => r.wsCabang },
  { col: "D", header: "Capem / Unit", width: 18, left: true, get: (r) => r.wsCapem },
  { col: "E", header: "Tanggal Masuk", width: 14, get: (r) => r.wsTanggalMasuk },
  { col: "F", header: "No Surat Cabang", width: 22, left: true, get: (r) => r.wsNoSurat },
  { col: "G", header: "Merek Komputer", width: 20, left: true, get: (r) => r.wsMerekKomputer },
  { col: "H", header: "Kelengkapan", width: 20, left: true, get: (r) => r.wsKelengkapan },
  { col: "I", header: "Serial Number", width: 16, get: (r) => r.wsSnKomputer },
  { col: "J", header: "Kerusakan", width: 26, left: true, get: (r) => r.wsKerusakan },
  { col: "K", header: "Tanggal ke Vendor", width: 14, get: (r) => r.wsTglKeVendor },
  { col: "L", header: "Vendor", width: 16, left: true, get: (r) => r.wsVendor },
  { col: "M", header: "Selesai Vendor", width: 14, get: (r) => r.wsTglSelesaiVendor },
  { col: "N", header: "Kembali ke Cabang", width: 14, get: (r) => r.wsTglKembaliKeCabang },
  { col: "O", header: "PIC Terima", width: 16, left: true, get: (r) => r.wsPicTerima },
  { col: "P", header: "Status", width: 12, get: (r) => r.status },
  { col: "Q", header: "Supervisi", width: 12, get: (r) => r.statusSupervisi },
  { col: "R", header: "Keterangan", width: 22, left: true, get: (r) => r.keterangan },
];

export async function buildWorkstationWorkbook(
  tickets: WorkstationReportRow[],
  dateRangeLabel: string,
  logoPath?: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "fq-Report";
  wb.created = new Date();

  const ws = wb.addWorksheet("Rekap Workstation", {
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
  rTitle.getCell("D").value = "REKAP LAPORAN PENANGANAN GANGGUAN WORKSTATION";
  rTitle.getCell("D").font = font({ size: 14, bold: true });

  const rSubtitle = ws.getRow(3);
  rSubtitle.getCell("D").value = `Rentang Tanggal: ${dateRangeLabel}`;
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

  // --- Data Rows ---
  let rowIdx = 7;
  for (const t of tickets) {
    const row = ws.getRow(rowIdx);
    row.height = 20;
    const isStripe = rowIdx % 2 === 0;

    for (const colDef of COLUMNS) {
      const cell = row.getCell(colDef.col);
      const val = colDef.get(t);
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
    rowIdx++;
  }

  const result = await wb.xlsx.writeBuffer();
  return Buffer.from(result as ArrayBuffer) as unknown as Buffer;
}
