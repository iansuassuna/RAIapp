import { EVALUATION_CRITERIA } from "@/config/options";
import { monthCycleFor } from "@/lib/cycle-period";
import type {
  Activity,
  Eixo,
  EvaluationRecord,
  InventoryItem,
  InventoryProposal,
  Loan,
  Member,
  Project,
  ResourceRequest,
} from "@/types";

export const SEED_PASSWORD = process.env.DEV_SEED_PASSWORD ?? "raitec123";

export const seedMembers: Member[] = [
  { id: "m2", name: "Bruno Lima", email: "bruno@raitec.ufc.br", eixo: "inovacao", time: "midias", role: "membro" },
  { id: "m1", name: "Ana Souza", email: "ana@raitec.ufc.br", eixo: "inovacao", time: null, role: "coordenador" },
  { id: "m3", name: "Carla Mendes", email: "carla@raitec.ufc.br", eixo: "inovacao", time: "processos", role: "membro" },
  { id: "m4", name: "Diego Rocha", email: "diego@raitec.ufc.br", eixo: "inovacao", time: "midias", role: "membro" },
  {
    id: "m5",
    name: "Eduardo Alves",
    email: "eduardo@raitec.ufc.br",
    eixo: "tecnico-sustentavel",
    time: null,
    role: "coordenador",
  },
  {
    id: "m6",
    name: "Fernanda Dias",
    email: "fernanda@raitec.ufc.br",
    eixo: "tecnico-sustentavel",
    time: "midias",
    role: "membro",
  },
  {
    id: "m7",
    name: "Gabriel Nunes",
    email: "gabriel@raitec.ufc.br",
    eixo: "tecnico-sustentavel",
    time: "processos",
    role: "membro",
  },
  {
    id: "m8",
    name: "Helena Costa",
    email: "helena@raitec.ufc.br",
    eixo: "tecnologias-saude",
    time: null,
    role: "coordenador",
  },
  {
    id: "m9",
    name: "Igor Martins",
    email: "igor@raitec.ufc.br",
    eixo: "tecnologias-saude",
    time: "processos",
    role: "membro",
  },
  {
    id: "m10",
    name: "Júlia Ramos",
    email: "julia@raitec.ufc.br",
    eixo: "tecnologias-saude",
    time: "processos",
    role: "membro",
  },
  { id: "d1", name: "Lucas Pereira", email: "lucas@raitec.ufc.br", eixo: null, time: null, role: "diretoria" },
];

export const seedMemberScores: Record<string, number> = {
  m1: 91,
  m2: 78,
  m3: 54,
  m4: 47,
  m5: 82,
  m6: 63,
  m7: 41,
  m8: 95,
  m9: 88,
  m10: 76,
  d1: 85,
};

/** Ciclos usados pelas avaliações do seed (os seguintes são criados automaticamente por data). */
export const SEED_CYCLES = {
  previous: monthCycleFor("2026-10-01"),
  current: monthCycleFor("2026-11-01"),
};

/**
 * Atividades com dono e pontos. Pontos de atividades concluídas entram no ledger; o restante da
 * pontuação de cada membro vem de um lançamento de "saldo inicial" (ver `seed.ts`).
 */
export const seedActivities: (Activity & { memberId: string; points: number; createdBy: string })[] = [
  {
    id: "a1",
    memberId: "m2",
    title: "Scrum e Trello",
    type: "capacitacao",
    date: "2026-10-27",
    status: "concluida",
    points: 10,
    createdBy: "m1",
  },
  {
    id: "a2",
    memberId: "m2",
    title: "Circuitos",
    type: "capacitacao",
    date: "2026-10-29",
    status: "concluida",
    points: 10,
    createdBy: "m1",
  },
  {
    id: "a3",
    memberId: "m2",
    title: "RAIgala",
    type: "projeto",
    date: "2026-10-30",
    status: "concluida",
    points: 15,
    createdBy: "m1",
  },
  {
    id: "a4",
    memberId: "m2",
    title: "Visita técnica — Laboratório",
    type: "visita",
    date: "2026-11-12",
    status: "em-andamento",
    points: 5,
    createdBy: "m1",
  },
  {
    id: "a5",
    memberId: "m3",
    title: "Scrum e Trello",
    type: "capacitacao",
    date: "2026-10-27",
    status: "concluida",
    points: 10,
    createdBy: "m1",
  },
  {
    id: "a6",
    memberId: "m6",
    title: "Curso de solda",
    type: "curso",
    date: "2026-11-05",
    status: "concluida",
    points: 8,
    createdBy: "m5",
  },
  {
    id: "a7",
    memberId: "m9",
    title: "Visita ao HUWC",
    type: "visita",
    date: "2026-11-08",
    status: "concluida",
    points: 6,
    createdBy: "m8",
  },
];

export const seedEixoGoals: {
  id: string;
  eixo: Eixo;
  title: string;
  deadline: string;
  status: "concluida" | "em-andamento" | "pendente";
}[] = [
  { id: "g1", eixo: "inovacao", title: "Capacitação Scrum e Trello", deadline: "2026-10-27", status: "concluida" },
  { id: "g2", eixo: "inovacao", title: "Hackathon interno", deadline: "2026-11-30", status: "em-andamento" },
  {
    id: "g3",
    eixo: "tecnico-sustentavel",
    title: "Capacitação de Circuitos",
    deadline: "2026-10-29",
    status: "concluida",
  },
  {
    id: "g4",
    eixo: "tecnico-sustentavel",
    title: "Protótipo de energia solar",
    deadline: "2026-12-15",
    status: "em-andamento",
  },
  { id: "g5", eixo: "tecnologias-saude", title: "RAIgala", deadline: "2026-10-30", status: "concluida" },
  {
    id: "g6",
    eixo: "tecnologias-saude",
    title: "Visita ao hospital universitário",
    deadline: "2026-12-05",
    status: "pendente",
  },
];

export const seedInventory: InventoryItem[] = [
  { id: "c1", name: "Arduino Uno R3", category: "Microcontrolador", cabinet: "A1", ownerEixo: "inovacao", total: 10 },
  { id: "c2", name: "ESP32 DevKit", category: "Microcontrolador", cabinet: "B2", ownerEixo: null, total: 8 },
  { id: "c3", name: "Raspberry Pi 4 (4GB)", category: "Computador", cabinet: "A2", ownerEixo: "inovacao", total: 3 },
  { id: "c4", name: "Sensor ultrassônico HC-SR04", category: "Sensor", cabinet: "A3", ownerEixo: null, total: 15 },
  { id: "c5", name: "Servo motor SG90", category: "Atuador", cabinet: "A3", ownerEixo: null, total: 12 },
  { id: "c6", name: "Protoboard 830 pontos", category: "Prototipagem", cabinet: "B1", ownerEixo: null, total: 20 },
  {
    id: "c7",
    name: "Painel solar 10W",
    category: "Energia",
    cabinet: "C2",
    ownerEixo: "tecnico-sustentavel",
    total: 4,
  },
  {
    id: "c8",
    name: "Sensor de oximetria MAX30102",
    category: "Sensor",
    cabinet: "C1",
    ownerEixo: "tecnologias-saude",
    total: 6,
  },
  { id: "c9", name: "Kit de jumpers", category: "Prototipagem", cabinet: "B1", ownerEixo: null, total: 25 },
  { id: "c10", name: "Multímetro digital", category: "Ferramenta", cabinet: "B1", ownerEixo: null, total: 5 },
];

export const seedLoans: Loan[] = [
  { id: "l1", componentId: "c1", memberId: "m4", quantity: 1, requestId: "r3", returnedAt: null },
];

export const seedProposals: InventoryProposal[] = [
  {
    id: "ip1",
    proposerId: "m9",
    action: "editar",
    itemId: "c2",
    data: { name: "ESP32 DevKit", category: "Microcontrolador", cabinet: "C1", ownerEixo: null, total: 8 },
    status: "pendente",
    createdAt: "2026-11-18T14:00:00.000Z",
  },
  {
    id: "ip2",
    proposerId: "m3",
    action: "criar",
    itemId: null,
    data: { name: "Sensor de gás MQ-135", category: "Sensor", cabinet: "A3", ownerEixo: "inovacao", total: 4 },
    status: "pendente",
    createdAt: "2026-11-19T09:10:00.000Z",
  },
];

export const seedProjects: Project[] = [
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
      {
        id: "t7",
        title: "Dimensionar painéis e bateria",
        assigneeId: "m7",
        deadline: "2026-11-12",
        status: "concluida",
      },
      {
        id: "t8",
        title: "Montar controlador de carga",
        assigneeId: "m6",
        deadline: "2026-11-28",
        status: "em-andamento",
      },
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
    tasks: [
      { id: "t10", title: "Levantamento de materiais", assigneeId: "m7", deadline: "2027-01-20", status: "a-fazer" },
    ],
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
      {
        id: "t13",
        title: "Validação com profissionais de saúde",
        assigneeId: "m8",
        deadline: "2026-12-05",
        status: "a-fazer",
      },
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

const base = { history: [] as ResourceRequest["history"] };

export const seedRequests: ResourceRequest[] = [
  {
    ...base,
    id: "r1",
    memberId: "m3",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: "p1",
    kind: "componente",
    componentId: "c4",
    quantity: 4,
    justification: "Sensores para o desafio de robótica do hackathon.",
    status: "pendente",
    progress: null,
    createdAt: "2026-11-14T13:20:00.000Z",
  },
  {
    ...base,
    id: "r2",
    memberId: "m2",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: "p2",
    kind: "reuniao",
    date: "2026-11-27",
    time: "14:00",
    room: "sala-2",
    justification: "Sessão de testes do app com os membros.",
    status: "pendente",
    progress: null,
    createdAt: "2026-11-16T10:05:00.000Z",
  },
  {
    ...base,
    id: "r3",
    memberId: "m4",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: null,
    kind: "componente",
    componentId: "c1",
    quantity: 1,
    justification: "Estudar para a capacitação de Arduino.",
    status: "aprovada",
    progress: "em-uso",
    createdAt: "2026-11-02T09:00:00.000Z",
    resolution: { by: "m1", note: "Devolver até o fim do mês.", at: "2026-11-03T12:00:00.000Z" },
  },
  {
    ...base,
    id: "r9",
    memberId: "m3",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: "p1",
    kind: "compra",
    itemName: 'Display OLED 0,96"',
    quantity: 2,
    deadline: "2026-12-10",
    estimatedValue: 70,
    justification: "Placar do hackathon.",
    status: "aprovada",
    progress: "aguardando",
    createdAt: "2026-11-12T11:00:00.000Z",
    resolution: { by: "m1", note: "", at: "2026-11-13T09:00:00.000Z" },
  },
  {
    ...base,
    id: "r10",
    memberId: "m2",
    eixo: "inovacao",
    reviewer: "coordenacao",
    projectId: null,
    kind: "verba",
    amount: 120,
    usage: "Transporte para a feira de tecnologia",
    deadline: "2026-11-29",
    justification: "Apresentar o App RAIapp na feira.",
    status: "aprovada",
    progress: "aguardando-liberacao",
    createdAt: "2026-11-10T15:00:00.000Z",
    resolution: { by: "m1", note: "", at: "2026-11-11T10:00:00.000Z" },
  },
  {
    ...base,
    id: "r4",
    memberId: "m6",
    eixo: "tecnico-sustentavel",
    reviewer: "coordenacao",
    projectId: "p3",
    kind: "componente",
    componentId: "c7",
    quantity: 2,
    justification: "Precisamos de mais dois painéis para atingir a potência do protótipo.",
    status: "pendente",
    progress: null,
    createdAt: "2026-11-17T15:40:00.000Z",
  },
  {
    ...base,
    id: "r11",
    memberId: "m7",
    eixo: "tecnico-sustentavel",
    reviewer: "coordenacao",
    projectId: "p3",
    kind: "autorizacao",
    startDate: "2026-11-15",
    endDate: "2026-12-15",
    justification: "Uso do laboratório de eletrônica para montar o controlador de carga.",
    status: "aprovada",
    progress: "ativa",
    createdAt: "2026-11-13T08:00:00.000Z",
    resolution: { by: "m5", note: "", at: "2026-11-14T09:00:00.000Z" },
  },
  {
    ...base,
    id: "r5",
    memberId: "m10",
    eixo: "tecnologias-saude",
    reviewer: "coordenacao",
    projectId: "p5",
    kind: "outros",
    explanation: "6 horas de impressora 3D para o case do oxímetro",
    date: null,
    justification: "Imprimir o case do oxímetro.",
    status: "recusada",
    progress: null,
    createdAt: "2026-11-10T08:30:00.000Z",
    resolution: {
      by: "m8",
      note: "Impressora em manutenção; reenviar na semana que vem.",
      at: "2026-11-11T09:00:00.000Z",
    },
  },
  {
    ...base,
    id: "r6",
    memberId: "m9",
    eixo: "tecnologias-saude",
    reviewer: "coordenacao",
    projectId: "p5",
    kind: "compra",
    itemName: "Sensor de temperatura MLX90614",
    quantity: 2,
    deadline: "2026-12-05",
    estimatedValue: 140,
    justification: "Medir temperatura sem contato no protótipo.",
    status: "pendente",
    progress: null,
    createdAt: "2026-11-18T11:10:00.000Z",
  },
  {
    ...base,
    id: "r7",
    memberId: "m1",
    eixo: "inovacao",
    reviewer: "diretoria",
    projectId: null,
    kind: "pedido",
    title: "Servidor de testes",
    explanation: "Um Raspberry Pi dedicado a hospedar o ambiente de testes do App RAIapp.",
    justification: "Hoje os testes rodam no notebook de um membro.",
    status: "pendente",
    progress: null,
    createdAt: "2026-11-18T09:30:00.000Z",
  },
  {
    ...base,
    id: "r8",
    memberId: "m8",
    eixo: "tecnologias-saude",
    reviewer: "diretoria",
    projectId: null,
    kind: "pedido",
    title: "Transporte para o hospital universitário",
    explanation: "Verba de R$ 300 para a visita técnica do eixo.",
    justification: "Visita técnica marcada para 05/12.",
    status: "aprovada",
    progress: "aguardando",
    createdAt: "2026-11-17T16:00:00.000Z",
    resolution: { by: "d1", note: "", at: "2026-11-18T10:00:00.000Z" },
  },
];

const SAMPLE_COMMENTS = [
  "Sempre disposto(a) a ajudar o time.",
  "Pode melhorar a comunicação sobre o andamento das tarefas.",
  "Entregas de ótima qualidade.",
  "Muito proativo(a) nas reuniões.",
  "",
];

function seededRating(seed: number) {
  return 3 + ((seed * 7919) % 3);
}

function buildEvaluations(): EvaluationRecord[] {
  const records: EvaluationRecord[] = [];
  const evaluable = seedMembers;
  evaluable.forEach((evaluatee, i) => {
    for (let k = 1; k <= 3; k++) {
      const evaluator = evaluable[(i + k * 2) % evaluable.length]!;
      if (evaluator.id === evaluatee.id) continue;
      const ratings = Object.fromEntries(
        EVALUATION_CRITERIA.map((c, ci) => [c.id, seededRating(i * 31 + k * 17 + ci * 5)]),
      );
      records.push({
        id: `e-${evaluatee.id}-${k}`,
        cycle: SEED_CYCLES.previous.id,
        evaluatorId: evaluator.id,
        evaluateeId: evaluatee.id,
        ratings,
        comment: SAMPLE_COMMENTS[(i + k) % SAMPLE_COMMENTS.length]!,
        submittedAt: `2026-10-${String(20 + k).padStart(2, "0")}T12:00:00.000Z`,
      });
    }
  });
  records.push({
    id: "e-now-1",
    cycle: SEED_CYCLES.current.id,
    evaluatorId: "m3",
    evaluateeId: "m2",
    ratings: { comprometimento: 5, comunicacao: 4, equipe: 5, tecnica: 4, proatividade: 4 },
    comment: "Mandou muito bem na divulgação do hackathon.",
    submittedAt: "2026-11-15T18:00:00.000Z",
  });
  return records;
}

export const seedEvaluations: EvaluationRecord[] = buildEvaluations();
