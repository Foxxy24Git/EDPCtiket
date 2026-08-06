import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PUBLIC_DIR = join(process.cwd(), "public");
/** Logo default bawaan aplikasi. */
const DEFAULT_LOGO_PNG = join(PUBLIC_DIR, "logo-bank-nagari.png");

/** URL logo aktif (relatif /public) atau null. Selalu null sekarang (default). */
export async function getLogoUrl(): Promise<string | null> {
  return null;
}

/** Path filesystem logo untuk laporan Excel. */
export async function resolveReportLogoPath(): Promise<string | null> {
  return existsSync(DEFAULT_LOGO_PNG) ? DEFAULT_LOGO_PNG : null;
}
