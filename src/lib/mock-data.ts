import { EVALUATION_CRITERIA, EVALUATION_CYCLES } from "@/config/options";
import type {
  Activity,
  EixoOverview,
  EvaluationRecord,
  InventoryItem,
  Member,
  Performance,
  Project,
  ResourceRequest,
  Trajectory,
} from "@/types";

/**
 * Dados de exemplo (sementes do banco em memória de `lib/db.ts`).
 * Substitua por chamadas reais em `src/lib/api` mantendo as mesmas assinaturas.
 */

/**
 * Membros — também alimentam o seletor de membro de teste do header.
 * Coordenação: um por eixo, sem time. Diretoria: sem eixo e sem time; vê todos os eixos.
 */
export const mockMembers: Member[] = [
  { id: "m2", name: "Bruno Lima", email: "bruno@raitec.ufc.br", eixo: "inovacao", time: "midias", role: "membro" },
  { id: "m1", name: "Ana Souza", email: "ana@raitec.ufc.br", eixo: "inovacao", time: null, role: "coordenador" },
  { id: "m3", name: "Carla Mendes", email: "carla@raitec.ufc.br", eixo: "inovacao", time: "processos", role: "membro" },
  { id: "m4", name: "Diego Rocha", email: "diego@raitec.ufc.br", eixo: "inovacao", time: "midias", role: "membro" },
  { id: "m5", name: "Eduardo Alves", email: "eduardo@raitec.ufc.br", eixo: "tecnico-sustentavel", time: null, role: "coordenador" },
  { id: "m6", name: "Fernanda Dias", email: "fernanda@raitec.ufc.br", eixo: "tecnico-sustentavel", time: "midias", role: "membro" },
  { id: "m7", name: "Gabriel Nunes", email: "gabriel@raitec.ufc.br", eixo: "tecnico-sustentavel", time: "processos", role: "membro" },
  { id: "m8", name: "Helena Costa", email: "helena@raitec.ufc.br", eixo: "tecnologias-saude", time: null, role: "coordenador" },
  { id: "m9", name: "Igor Martins", email: "igor@raitec.ufc.br", eixo: "tecnologias-saude", time: "processos", role: "membro" },
  { id: "m10", name: "Júlia Ramos", email: "julia@raitec.ufc.br", eixo: "tecnologias-saude", time: "processos", role: "membro" },
  { id: "d1", name: "Lucas Pereira", email: "lucas@raitec.ufc.br", eixo: null, time: null, role: "diretoria" },
];

/** Pontuação de cada membro no ciclo (0–100). */
export const mockMemberScores: Record<string, number> = {
  m1: 91, m2: 78, m3: 54, m4: 47, m5: 82, m6: 63, m7: 41, m8: 95, m9: 88, m10: 76, d1: 85,
};

export const mockPerformance: Performance = { score: 30, goal: 100 };

export const mockTrajectory: Trajectory = {
  capacitacoes: 5,
  cursos: 3,
  visitas: 4,
  atividades: 10,
};

export const mockActivities: Activity[] = [
  { id: "a1", title: "Scrum e Trello", type: "capacitacao", date: "2026-10-27", status: "concluida" },
  { id: "a2", title: "Circuitos", type: "capacitacao", date: "2026-10-29", status: "concluida" },
  { id: "a3", title: "RAIgala", type: "projeto", date: "2026-10-30", status: "concluida" },
  { id: "a4", title: "Visita técnica — Laboratório", type: "visita", date: "2026-11-12", status: "em-andamento" },
];

/** Parte fixa da visão de cada eixo; o resto (membros, projetos, médias) é calculado em `lib/api`. */
export const mockEixos: Pick<EixoOverview, "eixo" | "performance" | "activitiesCount" | "teams" | "goals">[] = [
  {
    eixo: "inovacao",
    performance: { score: 72, goal: 100 },
    activitiesCount: 31,
    teams: [
      { time: "processos", score: 78 },
      { time: "midias", score: 66 },
    ],
    goals: [
      { id: "g1", title: "Capacitação Scrum e Trello", deadline: "2026-10-27", status: "concluida" },
      { id: "g2", title: "Hackathon interno", deadline: "2026-11-30", status: "em-andamento" },
    ],
  },
  {
    eixo: "tecnico-sustentavel",
    performance: { score: 58, goal: 100 },
    activitiesCount: 22,
    teams: [
      { time: "processos", score: 61 },
      { time: "midias", score: 55 },
    ],
    goals: [
      { id: "g3", title: "Capacitação de Circuitos", deadline: "2026-10-29", status: "concluida" },
      { id: "g4", title: "Protótipo de energia solar", deadline: "2026-12-15", status: "em-andamento" },
    ],
  },
  {
    eixo: "tecnologias-saude",
    performance: { score: 85, goal: 100 },
    activitiesCount: 27,
    teams: [
      { time: "processos", score: 88 },
      { time: "midias", score: 81 },
    ],
    goals: [
      { id: "g5", title: "RAIgala", deadline: "2026-10-30", status: "concluida" },
      { id: "g6", title: "Visita ao hospital universitário", deadline: "2026-12-05", status: "pendente" },
    ],
  },
];

/** Componentes de propriedade do RAITec. */
export const mockInventory: InventoryItem[] = [
  { id: "c1", name: "Arduino Uno R3", category: "Microcontrolador", total: 10 },
  { id: "c2", name: "ESP32 DevKit", category: "Microcontrolador", total: 8 },
  { id: "c3", name: "Raspberry Pi 4 (4GB)", category: "Computador", total: 3 },
  { id: "c4", name: "Sensor ultrassônico HC-SR04", category: "Sensor", total: 15 },
  { id: "c5", name: "Servo motor SG90", category: "Atuador", total: 12 },
  { id: "c6", name: "Protoboard 830 pontos", category: "Prototipagem", total: 20 },
  { id: "c7", name: "Painel solar 10W", category: "Energia", total: 4 },
  { id: "c8", name: "Sensor de oximetria MAX30102", category: "Sensor", total: 6 },
  { id: "c9", name: "Kit de jumpers", category: "Prototipagem", total: 25 },
  { id: "c10", name: "Multímetro digital", category: "Ferramenta", total: 5 },
];

export const mockProjects: Project[] = [
  {
    id: "p1",
    eixo: "inovacao",
    name: "Hackathon interno",
    description: "Maratona de 24h para prototipar soluções para problemas do campus.",
    status: "em-andamento",
    startDate: "2026-10-01",
    deadline: "2026-11-30",
    memberIds: ["m1", "m2", "m3"],
    tasks: [
      { id: "t1", title: "Definir temas e regulamento", assigneeId: "m1", deadline: "2026-11-05", status: "concluida" },
      { id: "t2", title: "Divulgação nas redes", assigneeId: "m2", deadline: "2026-11-20", status: "em-andamento" },
      { id: "t3", title: "Reservar laboratório", assigneeId: "m3", deadline: "2026-11-15", status: "a-fazer" },
    ],
    components: [
      { componentId: "c1", quantity: 4 },
      { componentId: "c6", quantity: 6 },
    ],
  },
  {
    id: "p2",
    eixo: "inovacao",
    name: "App RAIapp",
    description: "Aplicativo para acompanhar a trajetória dos membros do RAITec.",
    status: "em-andamento",
    startDate: "2026-09-15",
    deadline: "2026-12-20",
    memberIds: ["m2", "m4"],
    tasks: [
      { id: "t4", title: "Protótipo das telas", assigneeId: "m2", deadline: "2026-11-10", status: "concluida" },
      { id: "t5", title: "Gestão de eixos", assigneeId: "m4", deadline: "2026-12-01", status: "em-andamento" },
      { id: "t6", title: "Testes com membros", assigneeId: "m2", deadline: "2026-12-15", status: "a-fazer" },
    ],
    components: [{ componentId: "c3", quantity: 1 }],
  },
  {
    id: "p3",
    eixo: "tecnico-sustentavel",
    name: "Protótipo de energia solar",
    description: "Estação de carregamento alimentada por energia solar para o pátio.",
    status: "em-andamento",
    startDate: "2026-10-10",
    deadline: "2026-12-15",
    memberIds: ["m5", "m6", "m7"],
    tasks: [
      { id: "t7", title: "Dimensionar painéis e bateria", assigneeId: "m7", deadline: "2026-11-12", status: "concluida" },
      { id: "t8", title: "Montar controlador de carga", assigneeId: "m6", deadline: "2026-11-28", status: "em-andamento" },
      { id: "t9", title: "Teste em campo", assigneeId: "m5", deadline: "2026-12-10", status: "a-fazer" },
    ],
    components: [
      { componentId: "c7", quantity: 2 },
      { componentId: "c2", quantity: 2 },
      { componentId: "c10", quantity: 1 },
    ],
  },
  {
    id: "p4",
    eixo: "tecnico-sustentavel",
    name: "Horta automatizada",
    description: "Irrigação automática com sensores de umidade do solo.",
    status: "planejamento",
    startDate: "2027-01-10",
    deadline: "2027-02-28",
    memberIds: ["m6", "m7"],
    tasks: [{ id: "t10", title: "Levantamento de materiais", assigneeId: "m7", deadline: "2027-01-20", status: "a-fazer" }],
    components: [],
  },
  {
    id: "p5",
    eixo: "tecnologias-saude",
    name: "Oxímetro de baixo custo",
    description: "Oxímetro de pulso com ESP32 e app de leitura para unidades de saúde.",
    status: "em-andamento",
    startDate: "2026-09-20",
    deadline: "2026-12-10",
    memberIds: ["m8", "m9", "m10"],
    tasks: [
      { id: "t11", title: "Leitura do sensor MAX30102", assigneeId: "m9", deadline: "2026-11-08", status: "concluida" },
      { id: "t12", title: "Case impresso em 3D", assigneeId: "m10", deadline: "2026-11-18", status: "em-andamento" },
      { id: "t13", title: "Validação com profissionais de saúde", assigneeId: "m8", deadline: "2026-12-05", status: "a-fazer" },
    ],
    components: [
      { componentId: "c8", quantity: 3 },
      { componentId: "c2", quantity: 3 },
    ],
  },
  {
    id: "p6",
    eixo: "tecnologias-saude",
    name: "RAIgala",
    description: "Evento de apresentação dos projetos do semestre.",
    status: "concluido",
    startDate: "2026-09-01",
    deadline: "2026-10-30",
    memberIds: ["m8", "m10"],
    tasks: [{ id: "t14", title: "Organizar estandes", assigneeId: "m10", deadline: "2026-10-28", status: "concluida" }],
    components: [],
  },
];

export const mockRequests: ResourceRequest[] = [
  {
    id: "r1",
    memberId: "m3",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: "p1",
    kind: "componente",
    componentId: "c4",
    quantity: 4,
    description: "",
    justification: "Sensores para o desafio de robótica do hackathon.",
    status: "pendente",
    createdAt: "2026-11-14T13:20:00.000Z",
  },
  {
    id: "r2",
    memberId: "m2",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: "p2",
    kind: "recurso",
    componentId: null,
    quantity: 1,
    description: "Sala de reuniões às quintas, 14h–16h",
    justification: "Sessões semanais de testes com os membros.",
    status: "pendente",
    createdAt: "2026-11-16T10:05:00.000Z",
  },
  {
    id: "r3",
    memberId: "m4",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: null,
    kind: "componente",
    componentId: "c1",
    quantity: 1,
    description: "",
    justification: "Estudar para a capacitação de Arduino.",
    status: "aprovada",
    createdAt: "2026-11-02T09:00:00.000Z",
    resolution: { by: "m1", note: "Devolver até o fim do mês.", at: "2026-11-03T12:00:00.000Z" },
  },
  {
    id: "r4",
    memberId: "m6",
    eixo: "tecnico-sustentavel",
    reviewer: "coordenacao",
    projectId: "p3",
    kind: "componente",
    componentId: "c7",
    quantity: 2,
    description: "",
    justification: "Precisamos de mais dois painéis para atingir a potência do protótipo.",
    status: "pendente",
    createdAt: "2026-11-17T15:40:00.000Z",
  },
  {
    id: "r5",
    memberId: "m10",
    eixo: "tecnologias-saude",
    reviewer: "coordenacao",
    projectId: "p5",
    kind: "recurso",
    componentId: null,
    quantity: 1,
    description: "6 horas de impressora 3D",
    justification: "Imprimir o case do oxímetro.",
    status: "recusada",
    createdAt: "2026-11-10T08:30:00.000Z",
    resolution: { by: "m8", note: "Impressora em manutenção; reenviar na semana que vem.", at: "2026-11-11T09:00:00.000Z" },
  },
  {
    id: "r6",
    memberId: "m9",
    eixo: "tecnologias-saude",
    reviewer: "coordenacao",
    projectId: "p5",
    kind: "componente",
    componentId: "c8",
    quantity: 2,
    description: "",
    justification: "Sensores extras para testes de precisão.",
    status: "pendente",
    createdAt: "2026-11-18T11:10:00.000Z",
  },
  // Requisições de coordenadores → diretoria
  {
    id: "r7",
    memberId: "m1",
    eixo: "inovacao",
    reviewer: "diretoria",
    projectId: "p2",
    kind: "componente",
    componentId: "c3",
    quantity: 1,
    description: "",
    justification: "Servidor de testes para o App RAIapp.",
    status: "pendente",
    createdAt: "2026-11-18T09:30:00.000Z",
  },
  {
    id: "r8",
    memberId: "m8",
    eixo: "tecnologias-saude",
    reviewer: "diretoria",
    projectId: null,
    kind: "recurso",
    componentId: null,
    quantity: 1,
    description: "Verba de R$ 300 para transporte até o hospital universitário",
    justification: "Visita técnica do eixo marcada para 05/12.",
    status: "pendente",
    createdAt: "2026-11-17T16:00:00.000Z",
  },
];

/* ---------- Avaliações de exemplo (geradas de forma determinística) ---------- */

const SAMPLE_COMMENTS = [
  "Sempre disposto(a) a ajudar o time.",
  "Pode melhorar a comunicação sobre o andamento das tarefas.",
  "Entregas de ótima qualidade.",
  "Muito proativo(a) nas reuniões.",
  "",
];

function seededRating(seed: number) {
  // Notas entre 3 e 5, variando de forma estável a partir do seed.
  return 3 + ((seed * 7919) % 3);
}

function buildEvaluations(): EvaluationRecord[] {
  const records: EvaluationRecord[] = [];
  const evaluable = mockMembers;
  evaluable.forEach((evaluatee, i) => {
    // Cada membro recebeu 3 avaliações no ciclo anterior.
    for (let k = 1; k <= 3; k++) {
      const evaluator = evaluable[(i + k * 2) % evaluable.length]!;
      if (evaluator.id === evaluatee.id) continue;
      const ratings = Object.fromEntries(
        EVALUATION_CRITERIA.map((c, ci) => [c.id, seededRating(i * 31 + k * 17 + ci * 5)]),
      );
      records.push({
        id: `e-${evaluatee.id}-${k}`,
        cycle: EVALUATION_CYCLES.previous,
        evaluatorId: evaluator.id,
        evaluateeId: evaluatee.id,
        ratings,
        comment: SAMPLE_COMMENTS[(i + k) % SAMPLE_COMMENTS.length]!,
        submittedAt: `2026-10-${String(20 + k).padStart(2, "0")}T12:00:00.000Z`,
      });
    }
  });
  // Algumas avaliações já enviadas no ciclo atual.
  records.push({
    id: "e-now-1",
    cycle: EVALUATION_CYCLES.current,
    evaluatorId: "m3",
    evaluateeId: "m2",
    ratings: { comprometimento: 5, comunicacao: 4, equipe: 5, tecnica: 4, proatividade: 4 },
    comment: "Mandou muito bem na divulgação do hackathon.",
    submittedAt: "2026-11-15T18:00:00.000Z",
  });
  return records;
}

export const mockEvaluations: EvaluationRecord[] = buildEvaluations();
