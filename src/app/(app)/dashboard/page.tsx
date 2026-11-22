import type { Metadata } from "next";
import { PerformanceCard, RecentActivities, TrajectoryGrid } from "@/features/dashboard";
import { getDashboard } from "@/lib/api";
import { firstName } from "@/lib/format";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const member = await getCurrentMember();
  const { performance, trajectory, activities } = await getDashboard(member);

  return (
    <div className="space-y-8 pt-7">
      <div className="animate-fade-up">
        <p className="text-sm text-ink-muted">Bom te ver por aqui 👋</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">
          Olá, {firstName(member.name)}!
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="space-y-8">
          <PerformanceCard performance={performance} />
          <TrajectoryGrid data={trajectory} />
        </div>
        <RecentActivities activities={activities} />
      </div>
    </div>
  );
}
