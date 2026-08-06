"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
} from "@/components/ui/Table";
import { fmtDateTime } from "@/lib/format";
import type { TicketListItem } from "@/lib/ticketQueries";

interface Props {
  initialItems: TicketListItem[];
  initialTotal: number;
  initialFrom: string;
  initialTo: string;
  wsCabangOptions: string[];
}

export function WeeklyMonitoringClient({
  initialItems,
  initialTotal,
  initialFrom,
  initialTo,
  wsCabangOptions,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<TicketListItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  // Filters
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cabang, setCabang] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const searchTickets = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      if (cabang) q.set("cabang", cabang);
      if (status) q.set("status", status);
      if (search) q.set("search", search);

      const res = await fetch(`/api/weekly?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (err) {
      console.error("Gagal memuat weekly tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Panel Filter */}
      <Card padding="md" className="bg-white border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Dari</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Sampai</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <Select
            label="Cabang"
            value={cabang}
            onChange={(e) => setCabang(e.target.value)}
          >
            <option value="">Semua Cabang</option>
            {wsCabangOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="proses">Dalam Proses</option>
            <option value="selesai">Selesai</option>
          </Select>

          <Button onClick={searchTickets} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Filter Tiket
          </Button>
        </div>

        <div className="relative mt-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nomor tiket, kerusakan, merek, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchTickets()}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </Card>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1 font-medium">
        <span>Menampilkan {items.length} dari {total} total tiket dalam rentang</span>
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Tidak ada data tiket workstation dalam pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>No Tiket</Th>
                  <Th>Cabang</Th>
                  <Th>Merek Komputer</Th>
                  <Th>SN Komputer</Th>
                  <Th>Tanggal Masuk</Th>
                  <Th>Kerusakan</Th>
                  <Th>Vendor</Th>
                  <Th>PIC Terima</Th>
                  <Th>Status</Th>
                  <Th>Supervisi</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => router.push(`/daily-monitoring/${t.id}`)}
                  >
                    <Td className="font-mono font-semibold text-primary">{t.noTiket}</Td>
                    <Td className="font-medium text-gray-900">{t.wsCabang}</Td>
                    <Td>{t.wsMerekKomputer || "—"}</Td>
                    <Td className="font-mono text-xs text-gray-600">{t.wsSnKomputer || "—"}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {t.wsTanggalMasuk ? fmtDateTime(t.wsTanggalMasuk) : "—"}
                    </Td>
                    <Td className="max-w-xs truncate" title={t.wsKerusakan}>
                      {t.wsKerusakan}
                    </Td>
                    <Td>{t.wsVendor || "—"}</Td>
                    <Td>{t.wsPicTerima || "—"}</Td>
                    <Td>
                      <Badge variant={t.status === "selesai" ? "success" : "warning"}>
                        {t.status === "selesai" ? "Selesai" : "Proses"}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant={t.statusSupervisi === "approved" ? "success" : "neutral"}>
                        {t.statusSupervisi === "approved" ? "Diapprove" : "Pending"}
                      </Badge>
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
