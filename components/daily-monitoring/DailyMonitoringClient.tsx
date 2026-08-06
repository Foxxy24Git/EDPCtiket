"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
  role: "superadmin" | "user" | "supervisi";
  supervisiUsers: { id: string; nama: string }[];
  currentUserId: string;
  currentUserHasTtd: boolean;
}

export function DailyMonitoringClient({
  initialItems,
}: Props) {
  const router = useRouter();
  const [items] = useState<TicketListItem[]>(initialItems);
  const [loading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.noTiket.toLowerCase().includes(q) ||
        (t.wsCabang && t.wsCabang.toLowerCase().includes(q)) ||
        (t.wsMerekKomputer && t.wsMerekKomputer.toLowerCase().includes(q)) ||
        (t.wsKerusakan && t.wsKerusakan.toLowerCase().includes(q))
    );
  }, [items, search]);

  return (
    <div className="space-y-4">
      {/* Search & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nomor tiket, kerusakan, merek, atau nama cabang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          <span className="text-xs text-gray-500 font-medium">
            {filteredItems.length} tiket proses
          </span>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Tidak ada tiket workstation aktif yang sedang diproses.
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
                  <Th>Petugas IT</Th>
                  <Th>Status Supervisi</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => router.push(`/daily-monitoring/${t.id}`)}
                  >
                    <Td className="font-mono font-semibold text-primary">
                      {t.noTiket}
                    </Td>
                    <Td className="font-medium text-gray-900">{t.wsCabang}</Td>
                    <Td>{t.wsMerekKomputer || "—"}</Td>
                    <Td className="font-mono text-xs text-gray-600">{t.wsSnKomputer || "—"}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {t.wsTanggalMasuk ? fmtDateTime(t.wsTanggalMasuk) : "—"}
                    </Td>
                    <Td className="max-w-xs truncate" title={t.wsKerusakan}>
                      {t.wsKerusakan}
                    </Td>
                    <Td className="text-gray-600">{t.ownerNama}</Td>
                    <Td>
                      <Badge
                        variant={t.statusSupervisi === "approved" ? "success" : "neutral"}
                      >
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
