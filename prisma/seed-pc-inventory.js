const { PrismaClient } = require("@prisma/client");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

const STANDARD_CABANG = [
  "PAYAKUMBUH", "BUKITTINGGI", "BATUSANGKAR", "SOLOK", "PARIAMAN",
  "PAINAN", "SIJUNJUNG", "LUBUK SIKAPING", "PASAR RAYA", "SITEBA",
  "SAWAHLUNTO", "SIMPANG EMPAT", "MUARA LABUH", "LUBUK GADANG",
  "KOTO BARU", "PULAU PUNJUNG", "UJUNG GADING", "LUBUK BASUNG",
  "LUBUK ALUNG", "TAPAN", "LINTAU", "CABANG UTAMA", "MENTAWAI",
  "TAPUS", "ALAHAN PANJANG", "JAKARTA", "PEKANBARU", "BATAM",
  "MEDAN", "BANDUNG", "SYARIAH PADANG", "SYARIAH PAYAKUMBUH",
  "SYARIAH BUKITTINGGI", "SYARIAH BATUSANGKAR", "PADANG PANJANG",
  "PULAU PUNJUNG BARAT", "BALAI SELASA", "PANGKALAN", "SYARIAH SOLOK"
];

function matchCabang(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const upper = s.toUpperCase().replace(/\s+/g, " ");

  if (STANDARD_CABANG.includes(upper)) return upper;
  if (upper === "BUKIT TINGGI") return "BUKITTINGGI";
  if (upper.includes("PAYAKUMBUH")) return "PAYAKUMBUH";
  if (upper.includes("BUKITTINGGI") || upper.includes("BUKIT TINGGI")) return "BUKITTINGGI";
  if (upper.includes("BATUSANGKAR")) return "BATUSANGKAR";
  if (upper.includes("SOLOK")) return upper.includes("SYARIAH") ? "SYARIAH SOLOK" : "SOLOK";
  if (upper.includes("PARIAMAN")) return "PARIAMAN";
  if (upper.includes("PAINAN")) return "PAINAN";
  if (upper.includes("SIJUNJUNG")) return "SIJUNJUNG";
  if (upper.includes("LUBUK SIKAPING")) return "LUBUK SIKAPING";
  if (upper.includes("PASAR RAYA")) return "PASAR RAYA";
  if (upper.includes("SITEBA")) return "SITEBA";
  if (upper.includes("SAWAHLUNTO")) return "SAWAHLUNTO";
  if (upper.includes("SIMPANG EMPAT") || upper.includes("SIMPANG IV")) return "SIMPANG EMPAT";
  if (upper.includes("MUARA LABUH")) return "MUARA LABUH";
  if (upper.includes("LUBUK GADANG")) return "LUBUK GADANG";
  if (upper.includes("KOTO BARU")) return "KOTO BARU";
  if (upper.includes("PULAU PUNJUNG")) return "PULAU PUNJUNG";
  if (upper.includes("UJUNG GADING")) return "UJUNG GADING";
  if (upper.includes("LUBUK BASUNG")) return "LUBUK BASUNG";
  if (upper.includes("LUBUK ALUNG")) return "LUBUK ALUNG";
  if (upper.includes("TAPAN")) return "TAPAN";
  if (upper.includes("LINTAU")) return "LINTAU";
  if (upper.includes("CABANG UTAMA") || upper.includes("UTAMA")) return "CABANG UTAMA";
  if (upper.includes("MENTAWAI")) return "MENTAWAI";
  if (upper.includes("TAPUS")) return "TAPUS";
  if (upper.includes("ALAHAN PANJANG")) return "ALAHAN PANJANG";
  if (upper.includes("JAKARTA")) return "JAKARTA";
  if (upper.includes("PEKANBARU")) return "PEKANBARU";
  if (upper.includes("BANDUNG")) return "BANDUNG";
  if (upper.includes("SYARIAH PADANG")) return "SYARIAH PADANG";
  if (upper.includes("PADANG PANJANG")) return "PADANG PANJANG";
  if (upper.includes("PANGKALAN")) return "PANGKALAN";

  return null;
}

function cleanSn(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase().includes("to be filled") || s === "-") return null;
  return s.toUpperCase();
}

function cleanMerk(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower.includes("to be filled") || lower.includes("system manufacturer")) return null;
  if (lower.includes("lenovo")) return "Lenovo";
  if (lower.includes("hewlett") || lower === "hp" || lower === "hpe") return "HP";
  if (lower.includes("asustek") || lower.includes("asus")) return "Asus";
  if (lower.includes("dell")) return "Dell";
  if (lower.includes("acer")) return "Acer";
  if (lower.includes("sony")) return "Sony";
  if (lower.includes("micro-star") || lower.includes("msi")) return "MSI";
  if (lower.includes("biostar")) return "Biostar";
  if (lower.includes("ecs")) return "ECS";
  if (lower.includes("intel")) return "Intel";
  return s;
}

function cleanJenis(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower.includes("to be filled") || lower === "unknown") return null;
  if (lower.includes("all in one") || lower.includes("aio") || lower.includes("proone")) return "All in One";
  if (
    lower.includes("desktop") ||
    lower.includes("tower") ||
    lower.includes("space-saving") ||
    lower.includes("prodesk") ||
    lower.includes("hp 200") ||
    lower.includes("hp 280") ||
    lower.includes("rack mount")
  ) {
    return "Desktop";
  }
  if (
    lower.includes("notebook") ||
    lower.includes("portable") ||
    lower.includes("convertible") ||
    lower.includes("detachable") ||
    lower.includes("k14 gen 1")
  ) {
    return "Laptop";
  }
  if (lower.includes("mini pc")) return "Mini PC";
  return null;
}

async function syncExistingTicketsToInventory() {
  console.log("\n=== MEMINDAHKAN TIKET LAMA YANG PERNAH DIBUAT KE MASTER SN ===");
  try {
    const existingTickets = await prisma.ticket.findMany({
      where: {
        kategori: "workstation",
        wsSnKomputer: { not: null },
      },
      orderBy: { createdAt: "asc" },
    });

    let countSynced = 0;
    for (const t of existingTickets) {
      const snClean = (t.wsSnKomputer || "").trim();
      if (!snClean || snClean === "-") continue;

      let parsedMerek = null;
      let parsedJenis = null;
      if (t.wsMerekKomputer) {
        const merekMatch = t.wsMerekKomputer.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (merekMatch) {
          const inside = merekMatch[1].trim();
          const brand = merekMatch[2].trim();
          if (brand) parsedMerek = brand;
          if (inside.includes(" - ")) {
            const parts = inside.split(" - ");
            parsedJenis = parts[1].trim();
          }
        } else {
          parsedMerek = t.wsMerekKomputer.trim();
        }
      }

      await prisma.pcInventory.upsert({
        where: { sn: snClean.toUpperCase() },
        update: {
          merek: parsedMerek ?? undefined,
          jenis: parsedJenis ?? undefined,
          cabang: t.wsCabang || undefined,
        },
        create: {
          sn: snClean.toUpperCase(),
          merek: parsedMerek,
          jenis: parsedJenis,
          cabang: t.wsCabang || null,
          lokasi: null,
        },
      });
      countSynced++;
    }

    console.log(`✅ BERHASIL SYNC ${countSynced} TIKET LAMA KE MASTER SN!`);
  } catch (err) {
    console.error("Gagal sync tiket lama ke pc_inventory:", err);
  }
}

async function main() {
  console.log("=== MEMULAI SEED MASTER SN PERANGKAT (DATA PC APP.xlsx & TIKET LAMA) ===");

  // 1. Import dari DATA PC APP.xlsx
  const excelPath = path.join(__dirname, "..", "data", "DATA PC APP.xlsx");
  if (fs.existsSync(excelPath)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const worksheet = workbook.getWorksheet(1);

    console.log(`Membaca ${worksheet.rowCount - 1} baris dari sheet '${worksheet.name}'...`);

    const rowsData = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Header
      const rawSn = row.getCell(1).value;
      const rawMerk = row.getCell(2).value;
      const rawJenis = row.getCell(3).value;
      const rawCabang = row.getCell(4).value;
      rowsData.push({ rawSn, rawMerk, rawJenis, rawCabang });
    });

    let countSkipped = 0;
    let countProcessed = 0;
    const uniqueMerks = new Set();

    for (const item of rowsData) {
      const sn = cleanSn(item.rawSn);
      if (!sn) {
        countSkipped++;
        continue;
      }

      const merek = cleanMerk(item.rawMerk);
      const jenis = cleanJenis(item.rawJenis);
      const cabangMatched = matchCabang(item.rawCabang);

      if (merek) uniqueMerks.add(merek);

      // Upsert ke pc_inventory
      await prisma.pcInventory.upsert({
        where: { sn },
        update: {
          merek: merek ?? undefined,
          jenis: jenis ?? undefined,
          cabang: cabangMatched ?? undefined,
        },
        create: {
          sn,
          merek,
          jenis,
          lokasi: null,
          cabang: cabangMatched,
        },
      });

      countProcessed++;
      if (countProcessed % 200 === 0) {
        console.log(`Terproses ${countProcessed} baris SN...`);
      }
    }

    console.log(`✅ BERHASIL MENG-IMPORT DATA SN EXCEL! (${countProcessed} valid, ${countSkipped} dibuang)`);

    // Update Master Options (Merek Komputer) di DB
    try {
      const existingOpt = await prisma.masterOption.findUnique({ where: { key: "merekKomputer" } });
      let currentMerks = ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"];
      if (existingOpt && existingOpt.value) {
        try {
          currentMerks = JSON.parse(existingOpt.value);
        } catch {}
      }

      const mergedMerks = Array.from(new Set([...currentMerks, ...uniqueMerks])).filter(Boolean);
      await prisma.masterOption.upsert({
        where: { key: "merekKomputer" },
        update: { value: JSON.stringify(mergedMerks) },
        create: { key: "merekKomputer", value: JSON.stringify(mergedMerks) },
      });

      const jsonPath = path.join(__dirname, "..", "data", "master_options.json");
      if (fs.existsSync(jsonPath)) {
        try {
          const jsonContent = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
          jsonContent.merekKomputer = mergedMerks;
          fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), "utf-8");
        } catch {}
      }
    } catch (optErr) {
      console.warn("Gagal menyuntikkan seed master options merek:", optErr);
    }
  }

  // 2. Import / Sync semua tiket lama yang pernah dibuat pengguna di sistem
  await syncExistingTicketsToInventory();
}

main()
  .catch((e) => {
    console.error("Error running seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
