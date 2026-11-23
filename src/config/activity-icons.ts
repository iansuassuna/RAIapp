import { BookOpen, Cpu, GraduationCap, type LucideIcon, MapPin } from "lucide-react";
import type { ActivityType } from "@/types";

/** Ícone de cada tipo de atividade (dashboard, tela de atividades, gestão pela coordenação). */
export const ACTIVITY_TYPE_ICON: Record<ActivityType, LucideIcon> = {
  capacitacao: GraduationCap,
  curso: BookOpen,
  visita: MapPin,
  projeto: Cpu,
};
