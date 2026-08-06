import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import fs from "fs";
import path from "path";

function formatIndonesianDate(dateStrOrObj: string | Date) {
  const date = typeof dateStrOrObj === "string" ? new Date(dateStrOrObj) : dateStrOrObj;
  const validDate = isNaN(date.getTime()) ? new Date() : date;

  const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulanList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const hari = hariList[validDate.getDay()];
  const tgl = validDate.getDate();
  const bulan = bulanList[validDate.getMonth()];
  const tahun = validDate.getFullYear();
  return {
    hari,
    tglFull: `${tgl} ${bulan} ${tahun}`,
    hariTglFull: `${hari} Tanggal ${tgl} ${bulan} ${tahun}`
  };
}

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-bank-nagari.png");
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }
  } catch (e) {
    console.error("Gagal konversi logo ke base64:", e);
  }
  return "/logo-bank-nagari.png";
}

interface BeritaAcaraPayload {
  cabang: string;
  tgl: string;
  diserahkanOleh: string;
  jabatanDiserahkan: string;
  diterimaOleh: string;
  diterimaPic: string;
  deviceList: Array<{ id: string; namaPerangkat: string; sn: string }>;
  format?: string;
  noTiket?: string;
}

function generateBeritaAcaraHtml(payload: BeritaAcaraPayload): string {
  const dateFormatted = formatIndonesianDate(payload.tgl);
  const logoBase64 = getLogoBase64();

  const isEdc = payload.deviceList.some(d => d.namaPerangkat.toLowerCase().includes("edc"));
  const tipeHeaderLabel = isEdc ? "Mesin EDC" : "Komputer All in One";

  const cabangText = payload.cabang.startsWith("Cabang")
    ? payload.cabang
    : `Cabang ${payload.cabang}`;

  const format = payload.format ?? "word";

  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>BERITA ACARA SERAH TERIMA PERANGKAT - ${payload.noTiket || payload.cabang}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 20mm 20mm 20mm 20mm;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #000000;
    background-color: #ffffff;
    margin: 0 auto;
    padding: ${format === 'print' ? '20px' : '10px'};
    max-width: 700px;
  }
  .header-logo {
    text-align: left;
    margin-bottom: 20px;
  }
  .title-section {
    text-align: center;
    margin-bottom: 24px;
  }
  .title-section h1 {
    font-size: 16px;
    font-weight: bold;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .title-section h2 {
    font-size: 15px;
    font-weight: bold;
    margin: 4px 0 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .intro-paragraph {
    margin-bottom: 20px;
    text-align: justify;
    line-height: 1.6;
  }
  .closing-paragraph {
    margin-top: 20px;
    margin-bottom: 24px;
    text-align: justify;
  }
  .location-date {
    text-align: center;
    margin-bottom: 20px;
    font-weight: normal;
  }
  .print-btn-bar {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #00569E;
    color: #fff;
    padding: 10px 20px;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
  }
  @media print {
    .print-btn-bar { display: none !important; }
  }
</style>
</head>
<body>
  ${format === 'print' ? `
    <div className="print-btn-bar" onclick="window.print()">
      🖨️ Cetak Dokumentasi / Simpan ke PDF
    </div>
  ` : ''}

  <!-- LOGO BANK NAGARI DENGAN LEBAR & TINGGI EKSPLISIT -->
  <div className="header-logo" align="left">
    <img src="${logoBase64}" width="160" height="42" alt="Logo Bank Nagari" style="width: 160px; height: 42px; max-height: 42px; object-fit: contain; display: block;" />
  </div>

  <!-- JUDUL DENGAN ALIGN CENTER EKSPLISIT -->
  <div className="title-section" align="center" style="text-align: center; margin: 20px 0 24px 0;">
    <h1 align="center" style="font-size: 16px; font-weight: bold; margin: 0; text-transform: uppercase; text-align: center; font-family: Arial, sans-serif;">BERITA ACARA</h1>
    <h2 align="center" style="font-size: 15px; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; text-align: center; font-family: Arial, sans-serif;">SERAH TERIMA PERANGKAT</h2>
  </div>

  <p className="intro-paragraph" style="margin-bottom: 20px; text-align: justify; line-height: 1.6;">
    Pada hari ini <strong>${dateFormatted.hari}</strong> Tanggal <strong>${dateFormatted.tglFull}</strong> telah di lakukan penyerahan <strong>${payload.deviceList.length} unit perangkat ${tipeHeaderLabel}</strong> milik <strong>${cabangText}</strong> dengan detail sebagai berikut:
  </p>

  <!-- TABEL RINCIAN DENGAN ATRIBUT BORDER MS WORD -->
  <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin: 20px 0; font-size: 13px; font-family: Arial, sans-serif;">
    <thead>
      <tr bgcolor="#99CCFF" style="background-color: #99CCFF;">
        <th border="1" style="border: 1px solid #000000; padding: 8px; text-align: center; width: 12%; font-weight: bold;">No</th>
        <th border="1" style="border: 1px solid #000000; padding: 8px; text-align: center; width: 58%; font-weight: bold;">Nama Perangkat</th>
        <th border="1" style="border: 1px solid #000000; padding: 8px; text-align: center; width: 30%; font-weight: bold;">S/N</th>
      </tr>
    </thead>
    <tbody>
      ${payload.deviceList.map((item, idx) => `
        <tr>
          <td border="1" style="border: 1px solid #000000; padding: 8px; text-align: center;">${idx + 1}</td>
          <td border="1" style="border: 1px solid #000000; padding: 8px;">${item.namaPerangkat}</td>
          <td border="1" style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: monospace;">${item.sn}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <p className="closing-paragraph" style="margin-top: 20px; margin-bottom: 24px; text-align: justify;">
    Demikianlah tanda terima ini dibuat rangkap 2 (dua) untuk dapat digunakan sebagaimana mestinya.
  </p>

  <!-- TANGGAL PADANG BERADA DI TENGAH -->
  <div className="location-date" align="center" style="text-align: center; margin: 20px 0; font-family: Arial, sans-serif;">
    Padang, ${dateFormatted.tglFull}
  </div>

  <!-- KOTAK TANDA TANGAN 2 KOLOM SAMA PERSIS PREVIEW -->
  <table border="1" cellspacing="0" cellpadding="10" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-top: 10px; font-size: 13px; font-family: Arial, sans-serif;">
    <tr>
      <td width="50%" height="140" valign="top" style="width: 50%; border: 1px solid #000000; vertical-align: top; padding: 12px; height: 140px;">
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; height: 100%;">
          <tr>
            <td valign="top">
              <div style="font-size: 13px;">Diserahkan oleh:</div>
              <div style="font-size: 11px; color: #444444;">${payload.jabatanDiserahkan}</div>
            </td>
          </tr>
          <tr>
            <td valign="bottom" style="padding-top: 45px;">
              <div style="font-size: 13px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">${payload.diserahkanOleh}</div>
              <div style="font-size: 11px; color: #555555;">Staff</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="50%" height="140" valign="top" style="width: 50%; border: 1px solid #000000; vertical-align: top; padding: 12px; height: 140px;">
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; height: 100%;">
          <tr>
            <td valign="top">
              <div style="font-size: 13px;">Diterima oleh:</div>
              <div style="font-size: 11px; color: #444444;">${payload.diterimaOleh}</div>
            </td>
          </tr>
          <tr>
            <td valign="bottom" style="padding-top: 45px;">
              <div style="font-size: 13px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">${payload.diterimaPic || "........................"}</div>
              <div style="font-size: 11px; color: #555555;">Penerima Cabang</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** POST /api/reports/berita-acara — Menerima data form & deviceList dinamis untuk download Word / Print */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const body = (await req.json()) as BeritaAcaraPayload;

    if (!body.cabang || !body.deviceList || body.deviceList.length === 0) {
      return NextResponse.json({ error: "Data cabang dan list perangkat wajib diisi." }, { status: 400 });
    }

    const htmlContent = generateBeritaAcaraHtml(body);
    const format = body.format ?? "word";

    if (format === "print") {
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const filename = `BERITA_ACARA_${body.cabang.replace(/\s+/g, "_")}.doc`;
    return new Response(htmlContent, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[POST /api/reports/berita-acara]", error);
    return NextResponse.json({ error: "Gagal membuat dokumen berita acara." }, { status: 500 });
  }
}

/** GET /api/reports/berita-acara — Fallback membaca dari database tiket */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const format = searchParams.get("format") ?? "word";

    if (!ticketId) {
      return NextResponse.json({ error: "Parameter ticketId wajib diisi." }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        owner: { select: { nama: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
    }

    const merekKomputer = ticket.wsMerekKomputer || "";
    const namaMerekPerangkatStr = merekKomputer.replace(/^\[.*?\]\s*/, "") || "Perangkat Workstation";

    const payload: BeritaAcaraPayload = {
      cabang: ticket.wsCabang || "Utama",
      tgl: ticket.wsTanggalMasuk ? new Date(ticket.wsTanggalMasuk).toISOString() : new Date().toISOString(),
      diserahkanOleh: (ticket.owner?.nama || session.username || "DIMAS TEGUH PRIBADI").toUpperCase(),
      jabatanDiserahkan: "Staff Bagian Infrastruktur Divisi T&D",
      diterimaOleh: `Cabang ${ticket.wsCabang || "Utama"}`,
      diterimaPic: ticket.wsPicTerima ? ticket.wsPicTerima.toUpperCase() : "",
      deviceList: [
        {
          id: ticket.id,
          namaPerangkat: namaMerekPerangkatStr,
          sn: ticket.wsSnKomputer || "-",
        },
      ],
      format,
      noTiket: ticket.noTiket,
    };

    const htmlContent = generateBeritaAcaraHtml(payload);

    if (format === "print") {
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const filename = `BERITA_ACARA_${ticket.noTiket.replace(/[^a-zA-Z0-9-]/g, "_")}.doc`;
    return new Response(htmlContent, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/berita-acara]", error);
    return NextResponse.json({ error: "Gagal membuat dokumen berita acara." }, { status: 500 });
  }
}
