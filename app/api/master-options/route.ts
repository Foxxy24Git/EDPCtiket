import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "master_options.json");

const DEFAULT_OPTIONS = {
  merekKomputer: ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"],
  merekEdc: ["Ingenico", "Verifone", "Pax", "Sunmi", "MoreFun", "Castle"],
  vendorList: ["PT Infomedia", "Vendor Lenovo", "PT Multipolar", "Vendor HP", "PT Visionet"],
};

function readOptions() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Gagal membaca master_options.json:", e);
  }
  return DEFAULT_OPTIONS;
}

function writeOptions(data: typeof DEFAULT_OPTIONS) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menulis master_options.json:", e);
  }
}

/** GET /api/master-options — mengambil opsi master list (Merek & Vendor) */
export async function GET() {
  const options = readOptions();
  return NextResponse.json(options);
}

/** POST /api/master-options — memperbarui opsi master list (khusus superadmin) */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya Super Admin yang dapat mengubah data master." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const current = readOptions();

  const merekKomputer = Array.isArray(body.merekKomputer) ? body.merekKomputer : current.merekKomputer;
  const merekEdc = Array.isArray(body.merekEdc) ? body.merekEdc : current.merekEdc;
  const vendorList = Array.isArray(body.vendorList) ? body.vendorList : current.vendorList;

  const updated = { merekKomputer, merekEdc, vendorList };
  writeOptions(updated);

  return NextResponse.json({ ok: true, options: updated });
}
