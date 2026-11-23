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

/** Atividade com dono e pontos (tela de atividades e gestão pela coordenação/diretoria). */
export type MemberActivity = Activity & { memberId: string; points: number };

export type ScoreSource = "atividade" | "ajuste";

/** Lançamento do histórico de pontuação (ledger). */
export type ScoreEntry = {
  id: string;
  delta: number;
  source: ScoreSource;
  reason: string;
  activityId: string | null;
  createdByName: string | null;
  createdAt: string; // ISO
};

export type EixoGoal = { id: string; eixo: Eixo; title: string; deadline: string; status: ActivityStatus };

/** Ciclo de avaliação por data. */
export type EvaluationCyclePeriod = { id: string; label: string; startsOn: string; endsOn: string };

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

/* ---------- Inventário ---------- */

/** Componente de propriedade do RAITec. `ownerEixo: null` = sem propriedade (de todos). */
export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  cabinet: string;
  ownerEixo: Eixo | null;
  total: number;
};
export type InventoryAvailability = InventoryItem & { inUse: number; available: number };

/** Componente emprestado a um membro (uso fora de projeto). */
export type Loan = {
  id: string;
  componentId: string;
  memberId: string;
  quantity: number;
  requestId: string | null;
  returnedAt: string | null;
};

export type InventoryItemInput = Omit<InventoryItem, "id">;

/** Alteração de inventário proposta pelo time Processos — só vale depois de aprovada. */
export type InventoryProposal = {
  id: string;
  proposerId: string;
  action: "criar" | "editar" | "excluir";
  itemId: string | null;
  data: InventoryItemInput | null;
  status: "pendente" | "aplicada" | "recusada";
  createdAt: string;
  resolution?: { by: string; note: string; at: string };
};

/* ---------- Requisições ---------- */

/** Tipo da requisição. "pedido" = requisição de coordenador à diretoria (título/explicação/justificativa). */
export type RequestKind = "componente" | "reuniao" | "autorizacao" | "verba" | "compra" | "outros" | "pedido";
/** Quem analisa a requisição: membros pedem à coordenação do eixo; coordenadores pedem à diretoria. */
export type RequestReviewer = "coordenacao" | "diretoria";
export type RequestStatus = "pendente" | "aprovada" | "recusada";

/** Andamento depois da aprovação (o ciclo de cada tipo está em `config/requests.ts`). */
export type RequestProgress =
  | "em-uso"
  | "devolvido"
  | "agendada"
  | "realizada"
  | "ativa"
  | "expirada"
  | "revogada"
  | "aguardando-liberacao"
  | "liberada"
  | "prestacao-entregue"
  | "aguardando"
  | "feito";

export type RequestDetails =
  | { kind: "componente"; componentId: string; quantity: number }
  | { kind: "reuniao"; date: string; time: string; room: string }
  | { kind: "autorizacao"; startDate: string; endDate: string }
  | { kind: "verba"; amount: number; usage: string; deadline: string }
  | { kind: "compra"; itemName: string; quantity: number; deadline: string; estimatedValue: number }
  | { kind: "outros"; explanation: string; date: string | null }
  | { kind: "pedido"; title: string; explanation: string };

export type ResourceRequest = {
  id: string;
  memberId: string;
  /** Eixo de quem pediu. */
  eixo: Eixo;
  reviewer: RequestReviewer;
  projectId: string | null;
  justification: string;
  status: RequestStatus;
  /** Preenchido na aprovação; muda conforme o ciclo do tipo. */
  progress: RequestProgress | null;
  createdAt: string; // ISO
  resolution?: { by: string; note: string; at: string };
  /** Histórico de mudanças de andamento. */
  history: { progress: RequestProgress; by: string; at: string }[];
  /** Compra concluída: item criado no inventário e valor pago. */
  purchase?: { itemId: string; paidValue: number; at: string };
} & RequestDetails;

/** Prazo vindo de uma requisição (compra, verba, reunião, outros) para "Prazos e tarefas". */
export type RequestDeadline = {
  requestId: string;
  title: string;
  kind: RequestKind;
  deadline: string;
  progress: RequestProgress;
  projectId: string | null;
  eixo: Eixo;
  /** Quem pediu (para a lista da coordenação). */
  memberId: string;
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
  /** Id do ciclo vigente ("AAAA-MM"); o formulário envia de volta para detectar ciclo encerrado. */
  id: string;
  label: string;
  endsOn: string;
  /** Dias até o fim do ciclo (0 = termina hoje). */
  daysLeft: number;
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
export type ActionResult =
  | { ok: true; id?: string /** true = virou proposta aguardando aprovação (time Processos). */; pending?: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Linha de prazo vinda de outra área (ex.: compra aprovada) para listas de tarefas. Só exibição. */
export type DeadlineRow = {
  id: string;
  title: string;
  subtitle: string;
  deadline: string;
  badge: { label: string; tone: "brand" | "warning" | "success" | "danger" | "accent" };
  href?: string;
};
