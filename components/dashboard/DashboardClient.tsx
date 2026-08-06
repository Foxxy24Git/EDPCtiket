"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fmtDateKey, fmtTime } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboardQueries";
import { MetricCards } from "./MetricCards";
import { MiniCalendar } from "./MiniCalendar";
import { DayTicketList } from "./DayTicketList";
import { AlertDock } from "./AlertDock";
import { ChartsRow } from "./ChartsRow";

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

interface Props {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Gagal refresh dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markedDates = useMemo(
    () => new Set(data.recentTickets.map((t) => fmtDateKey(t.waktuOpen))),
    [data.recentTickets]
  );

  const dayTickets = useMemo(
    () =>
      selected
        ? data.recentTickets.filter((t) => fmtDateKey(t.waktuOpen) === selected)
        : [],
    [selected, data.recentTickets]
  );

  return (
    <div className="space-y-6">
      {/* Toolbar refresh */}
      <div className="flex items-center justify-end gap-3 text-sm">
        <span className="text-gray-400">
          Diperbarui {fmtTime(data.generatedAt)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          loading={loading}
        >
          {!loading && <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <MetricCards counts={data.counts} />

      {/* Analytics Charts */}
      <ChartsRow
        branchStats={data.branchStats}
        brandStats={data.brandStats}
        dailyTrend={data.dailyTrend}
      />

      {/* Kalender & Tiket Harian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card padding="lg">
          <CardTitle className="mb-4">Kalender Tiket Berjalan</CardTitle>
          <MiniCalendar
            markedDates={markedDates}
            selected={selected}
            onSelect={setSelected}
          />
        </Card>
        <Card padding="lg">
          <CardTitle className="mb-4">Tiket pada Tanggal Terpilih</CardTitle>
          <DayTicketList dateKey={selected} tickets={dayTickets} />
        </Card>
      </div>

      {/* Alert Open Tickets */}
      <AlertDock openTickets={data.openTickets} />
    </div>
  );
}
