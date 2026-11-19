import type {
  ActivityStatus,
  ActivityType,
  Eixo,
  EvaluationCriterion,
  Member,
  MemberStanding,
  ProjectStatus,
  RequestKind,
  RequestReviewer,
  RequestStatus,
  Role,
  TaskStatus,
  Time,
} from "@/types";

/** Estrutura oficial do grupo: 3 eixos e 2 times. Troque por dados da API quando houver backend. */
export const EIXOS: { value: Eixo; label: string }[] = [
  { value: "inovacao", label: "Inovação" },
  { value: "tecnico-sustentavel", label: "Técnico Sustentável" },
  { value: "tecnologias-saude", label: "Tecnologias em Saúde" },
];

export const TIMES: { value: Time; label: string }[] = [
  { value: "processos", label: "Processos" },
  { value: "midias", label: "Mídias" },
];

export const ROLE_LABEL: Record<Role, string> = {
  membro: "Membro",
  coordenador: "Coordenação",
  diretoria: "Diretoria",
};

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  capacitacao: "Capacitação",
  curso: "Curso",
  visita: "Visita",
  projeto: "Projeto",
};

export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  concluida: "Concluída",
  "em-andamento": "Em andamento",
  pendente: "Pendente",
};

/** Cor do Badge para cada status (prop `tone` do Badge). */
export const ACTIVITY_STATUS_TONE: Record<ActivityStatus, "success" | "warning" | "brand"> = {
  concluida: "success",
  "em-andamento": "warning",
  pendente: "brand",
};

export const MEMBER_STANDING_LABEL: Record<MemberStanding, string> = {
  "em-dia": "Em dia",
  atencao: "Atenção",
};

export const MEMBER_STANDING_TONE: Record<MemberStanding, "success" | "danger"> = {
  "em-dia": "success",
  atencao: "danger",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planejamento: "Planejamento",
  "em-andamento": "Em andamento",
  concluido: "Concluído",
};
export const PROJECT_STATUS_TONE: Record<ProjectStatus, "brand" | "warning" | "success"> = {
  planejamento: "brand",
  "em-andamento": "warning",
  concluido: "success",
};
export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  "a-fazer": "A fazer",
  "em-andamento": "Em andamento",
  concluida: "Concluída",
};
export const TASK_STATUS_TONE: Record<TaskStatus, "brand" | "warning" | "success"> = {
  "a-fazer": "brand",
  "em-andamento": "warning",
  concluida: "success",
};
export const TASK_STATUSES = Object.keys(TASK_STATUS_LABEL) as TaskStatus[];

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  componente: "Componente",
  recurso: "Recurso",
};
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recusada: "Recusada",
};
export const REQUEST_STATUS_TONE: Record<RequestStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  aprovada: "success",
  recusada: "danger",
};

/** Ciclos da avaliação cruzada. Troque quando houver backend. */
export const EVALUATION_CYCLES = { current: "Novembro/26", previous: "Outubro/26" } as const;

export const EVALUATION_CRITERIA: EvaluationCriterion[] = [
  { id: "comprometimento", label: "Comprometimento", description: "Cumpre prazos e está presente nas atividades." },
  { id: "comunicacao", label: "Comunicação", description: "Se expressa com clareza e mantém o time informado." },
  { id: "equipe", label: "Trabalho em equipe", description: "Colabora, ajuda colegas e respeita opiniões." },
  { id: "tecnica", label: "Entrega técnica", description: "Qualidade do que produz nos projetos." },
  { id: "proatividade", label: "Proatividade", description: "Toma iniciativa e propõe melhorias." },
];

/** Legenda da escala de 1 a 5 usada na avaliação cruzada. */
export const RATING_SCALE = [
  { value: 1, label: "Muito abaixo" },
  { value: 2, label: "Abaixo" },
  { value: 3, label: "Esperado" },
  { value: 4, label: "Acima" },
  { value: 5, label: "Muito acima" },
] as const;

/** Vínculo do membro em texto: "Mídias · Inovação", "Coordenação · Inovação" ou "Diretoria". */
export function describeMember(m: Pick<Member, "role" | "eixo" | "time">) {
  if (m.role === "diretoria" || !m.eixo) return ROLE_LABEL.diretoria;
  const first = m.role === "coordenador" || !m.time ? ROLE_LABEL.coordenador : timeLabel(m.time);
  return `${first} · ${eixoLabel(m.eixo)}`;
}

/** Só o papel/time, sem o eixo: "Mídias", "Coordenação" ou "Diretoria". */
export function memberRoleOrTime(m: Pick<Member, "role" | "time">) {
  return m.role === "membro" && m.time ? timeLabel(m.time) : ROLE_LABEL[m.role];
}

export const REQUEST_REVIEWER_LABEL: Record<RequestReviewer, string> = {
  coordenacao: "Coordenação do eixo",
  diretoria: "Diretoria",
};

export function eixoLabel(eixo: Eixo) {
  return EIXOS.find((e) => e.value === eixo)?.label ?? eixo;
}

export function timeLabel(time: Time) {
  return TIMES.find((t) => t.value === time)?.label ?? time;
}

export function isEixo(value: unknown): value is Eixo {
  return EIXOS.some((e) => e.value === value);
}
