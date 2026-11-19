export type Eixo = "inovacao" | "tecnico-sustentavel" | "tecnologias-saude";
export type Time = "processos" | "midias";

/** Diretoria vê todos os eixos; coordenador (um por eixo) e membro veem só o próprio. */
export type Role = "membro" | "coordenador" | "diretoria";

type MemberBase = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

/**
 * Membro do RAITec. O papel define o vínculo:
 * - membro: tem eixo e time;
 * - coordenador: coordena um eixo e não tem time;
 * - diretoria: não é afiliada a eixo nem a time.
 */
export type Member =
  | (MemberBase & { role: "membro"; eixo: Eixo; time: Time })
  | (MemberBase & { role: "coordenador"; eixo: Eixo; time: null })
  | (MemberBase & { role: "diretoria"; eixo: null; time: null });

/** Quem tem eixo (membro ou coordenador). */
export type EixoMemberRole = Exclude<Member, { role: "diretoria" }>;

export type ActivityType = "capacitacao" | "curso" | "visita" | "projeto";
export type ActivityStatus = "concluida" | "em-andamento" | "pendente";

export type Activity = {
  id: string;
  title: string;
  type: ActivityType;
  date: string; // ISO
  status: ActivityStatus;
};

export type Trajectory = {
  capacitacoes: number;
  cursos: number;
  visitas: number;
  atividades: number;
};

export type Performance = {
  score: number;
  goal: number;
};

/* ---------- Gestão de Eixos ---------- */

export type MemberStanding = "em-dia" | "atencao";

/** Membro com a pontuação no ciclo — usado na aba Membros do eixo. */
export type EixoMember = EixoMemberRole & { score: number; standing: MemberStanding };

export type EixoOverview = {
  eixo: Eixo;
  coordinator: string | null;
  performance: Performance;
  memberCount: number;
  activeProjects: number;
  activitiesCount: number;
  /** Média da avaliação cruzada do eixo no ciclo anterior (escala 1–5), ou null sem dados. */
  crossEvaluationAverage: number | null;
  teams: { time: Time; score: number }[];
  goals: { id: string; title: string; deadline: string; status: ActivityStatus }[];
};

/* ---------- Projetos ---------- */

export type ProjectStatus = "planejamento" | "em-andamento" | "concluido";
export type TaskStatus = "a-fazer" | "em-andamento" | "concluida";

export type Task = {
  id: string;
  title: string;
  assigneeId: string | null;
  deadline: string; // ISO (AAAA-MM-DD)
  status: TaskStatus;
};

/** Componente do inventário do RAITec alocado a um projeto. */
export type ProjectComponent = { componentId: string; quantity: number };

export type Project = {
  id: string;
  eixo: Eixo;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  deadline: string;
  memberIds: string[];
  tasks: Task[];
  components: ProjectComponent[];
};

/* ---------- Inventário e requisições ---------- */

/** Componente de propriedade do RAITec. */
export type InventoryItem = { id: string; name: string; category: string; total: number };
export type InventoryAvailability = InventoryItem & { available: number };

export type RequestKind = "componente" | "recurso";
/** Quem analisa a requisição: membros pedem à coordenação do eixo; coordenadores pedem à diretoria. */
export type RequestReviewer = "coordenacao" | "diretoria";
export type RequestStatus = "pendente" | "aprovada" | "recusada";

export type ResourceRequest = {
  id: string;
  memberId: string;
  /** Eixo de quem pediu. */
  eixo: Eixo;
  reviewer: RequestReviewer;
  projectId: string | null;
  kind: RequestKind;
  /** Só para kind = "componente". */
  componentId: string | null;
  quantity: number;
  /** Para kind = "recurso": o que está sendo pedido (sala, impressora 3D, verba…). */
  description: string;
  justification: string;
  status: RequestStatus;
  createdAt: string; // ISO
  resolution?: { by: string; note: string; at: string };
};

/* ---------- Avaliação Cruzada ---------- */

export type EvaluationCriterion = {
  id: string;
  label: string;
  description: string;
};

export type Colleague = Pick<Member, "id" | "name" | "eixo" | "time" | "role">;

export type EvaluationRecord = {
  id: string;
  cycle: string;
  evaluatorId: string;
  evaluateeId: string;
  ratings: Record<string, number>;
  comment: string;
  submittedAt: string; // ISO
};

export type EvaluationCycle = {
  label: string;
  criteria: EvaluationCriterion[];
  /** Colegas que o membro atual deve avaliar (todos os eixos, exceto ele mesmo). */
  colleagues: Colleague[];
  /** Avaliações que o membro já enviou neste ciclo, por id do colega. */
  submitted: Record<string, { ratings: Record<string, number>; comment: string }>;
  /** Médias recebidas no ciclo anterior, por id de critério (escala 1–5). */
  received: Record<string, number>;
};

/* ---------- Ações ---------- */

/** Resultado padrão de mutações (Server Actions e funções de escrita de `lib/api`). */
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };
