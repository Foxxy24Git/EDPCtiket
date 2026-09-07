import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/roles";

export const COOKIE_NAME = "fq_session";

/** 
 * Durasi sesi standar aplikasi internal bank: 12 Jam (mencakup 1 shift kerja penuh).
 * Dapat disesuaikan via environment variable SESSION_MAX_AGE_HOURS di .env.
 */
export const SESSION_MAX_AGE =
  (parseInt(process.env.SESSION_MAX_AGE_HOURS || "12", 10) || 12) * 60 * 60;

export interface SessionPayload {
  sub: string; // user id
  username: string;
  nama: string;
  role: Role;
  /** Shift aktif. Kosong ("") bila petugas belum memilih shift di Dashboard. */
  shift: string;
  /**
   * Awal sesi shift (ISO 8601). Diisi saat user memilih shift, dikosongkan
   * saat login & saat serah terima shift. Dipakai Daily Monitoring untuk
   * membatasi tiket pada shift session yang sedang berjalan (PRD revisi §4.B).
   */
  shiftStartedAt: string;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET tidak diset");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      nama: String(payload.nama),
      role: payload.role as Role,
      shift: typeof payload.shift === "string" ? payload.shift : "",
      shiftStartedAt:
        typeof payload.shiftStartedAt === "string" ? payload.shiftStartedAt : "",
    };
  } catch {
    return null;
  }
}
