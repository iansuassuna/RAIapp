import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { CycleList } from "@/features/diretoria";
import { listEvaluationCycles } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Ciclos de avaliação · Diretoria" };

export default async function DirectorCyclesPage() {
  const cycles = await listEvaluationCycles(await getCurrentMember());
  if (!cycles) forbidden();

  return (
    <div className="max-w-3xl">
      <CycleList cycles={cycles} />
    </div>
  );
}
