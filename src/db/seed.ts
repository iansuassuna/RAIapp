import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { type Database, db } from "./index";
import {
  account,
  activities,
  eixoGoals,
  evaluationCycles,
  evaluations,
  inventoryItems,
  inventoryProposals,
  loans,
  notifications,
  projectComponents,
  projectMembers,
  projects,
  requestHistory,
  resourceRequests,
  scoreEntries,
  session,
  tasks,
  user,
  verification,
} from "./schema";
import {
  SEED_CYCLES,
  SEED_PASSWORD,
  seedActivities,
  seedEixoGoals,
  seedEvaluations,
  seedInventory,
  seedLoans,
  seedMemberScores,
  seedMembers,
  seedProjects,
  seedProposals,
  seedRequests,
} from "./seed-data";

let cachedPasswordHash: string | null = null;

async function getSeedPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await hashPassword(SEED_PASSWORD);
  }
  return cachedPasswordHash;
}

/**
 * Popula o banco com os dados iniciais do RAITec de forma idempotente (`onConflictDoNothing`).
 */
export async function seedDatabase(targetDb: Database = db) {
  const passwordHash = await getSeedPasswordHash();

  const insertedUsers = await targetDb
    .insert(user)
    .values(
      seedMembers.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        emailVerified: true,
        image: m.avatarUrl ?? null,
        role: m.role,
        eixo: m.eixo,
        time: m.time,
        score: seedMemberScores[m.id] ?? 0,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: user.id });
  const freshUsers = new Set(insertedUsers.map((u) => u.id));

  await targetDb
    .insert(account)
    .values(
      seedMembers.map((m) => ({
        id: `acc-${m.id}`,
        accountId: m.id,
        providerId: "credential",
        userId: m.id,
        password: passwordHash,
      })),
    )
    .onConflictDoNothing();

  await targetDb.insert(eixoGoals).values(seedEixoGoals).onConflictDoNothing();

  const insertedActivities = await targetDb
    .insert(activities)
    .values(seedActivities)
    .onConflictDoNothing()
    .returning({ id: activities.id });
  const freshActivities = new Set(insertedActivities.map((a) => a.id));

  // Ledger idempotente e coerente com user.score (= SUM(delta)), inclusive rodando sobre um banco já usado:
  // - só lança pontos de atividades inseridas AGORA;
  // - usuário novo: saldo inicial = pontuação do seed − pontos dessas atividades (o total já está no score);
  // - usuário que já existia: o score sobe pelos pontos lançados agora.
  const activityEntries = seedActivities
    .filter((a) => freshActivities.has(a.id) && a.status === "concluida" && a.points > 0)
    .map((a) => ({
      id: `se-act-${a.id}`,
      memberId: a.memberId,
      delta: a.points,
      source: "atividade" as const,
      activityId: a.id,
      reason: `Atividade concluída: ${a.title}`,
      createdBy: a.createdBy,
    }));
  const initialEntries = seedMembers
    .filter((m) => freshUsers.has(m.id))
    .flatMap((m) => {
      const fromActivities = activityEntries.filter((e) => e.memberId === m.id).reduce((sum, e) => sum + e.delta, 0);
      const delta = (seedMemberScores[m.id] ?? 0) - fromActivities;
      return delta === 0
        ? []
        : [
            {
              id: `se-init-${m.id}`,
              memberId: m.id,
              delta,
              source: "ajuste" as const,
              activityId: null,
              reason: "Saldo inicial (antes do histórico de pontuação)",
              createdBy: null,
            },
          ];
    });
  if (initialEntries.length + activityEntries.length > 0) {
    await targetDb
      .insert(scoreEntries)
      .values([...initialEntries, ...activityEntries])
      .onConflictDoNothing();
  }
  for (const entry of activityEntries.filter((e) => !freshUsers.has(e.memberId))) {
    await targetDb
      .update(user)
      .set({ score: sql`${user.score} + ${entry.delta}` })
      .where(eq(user.id, entry.memberId));
  }

  await targetDb.insert(inventoryItems).values(seedInventory).onConflictDoNothing();

  await targetDb
    .insert(projects)
    .values(
      seedProjects.map((p) => ({
        id: p.id,
        eixo: p.eixo,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        deadline: p.deadline,
      })),
    )
    .onConflictDoNothing();

  const memberLinks = seedProjects.flatMap((p) => p.memberIds.map((memberId) => ({ projectId: p.id, memberId })));
  if (memberLinks.length > 0) {
    await targetDb.insert(projectMembers).values(memberLinks).onConflictDoNothing();
  }

  const allTasks = seedProjects.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      projectId: p.id,
      title: t.title,
      assigneeId: t.assigneeId,
      deadline: t.deadline,
      status: t.status,
    })),
  );
  if (allTasks.length > 0) {
    await targetDb.insert(tasks).values(allTasks).onConflictDoNothing();
  }

  const allComponents = seedProjects.flatMap((p) =>
    p.components.map((c) => ({
      projectId: p.id,
      componentId: c.componentId,
      quantity: c.quantity,
    })),
  );
  if (allComponents.length > 0) {
    await targetDb.insert(projectComponents).values(allComponents).onConflictDoNothing();
  }

  await targetDb
    .insert(inventoryProposals)
    .values(
      seedProposals.map((p) => ({
        id: p.id,
        proposerId: p.proposerId,
        action: p.action,
        itemId: p.itemId,
        data: p.data,
        status: p.status,
        resolvedBy: p.resolution?.by ?? null,
        resolutionNote: p.resolution?.note ?? null,
        resolvedAt: p.resolution ? new Date(p.resolution.at) : null,
        createdAt: new Date(p.createdAt),
      })),
    )
    .onConflictDoNothing();

  await targetDb
    .insert(resourceRequests)
    .values(
      seedRequests.map((r) => {
        const {
          id,
          memberId,
          eixo,
          reviewer,
          projectId,
          justification,
          status,
          progress,
          createdAt,
          resolution,
          history: _history,
          purchase,
          ...details
        } = r;
        return {
          id,
          memberId,
          eixo,
          reviewer,
          projectId,
          kind: r.kind,
          details,
          meetingDate: r.kind === "reuniao" ? r.date : null,
          meetingTime: r.kind === "reuniao" ? r.time : null,
          meetingRoom: r.kind === "reuniao" ? r.room : null,
          justification,
          status,
          progress,
          resolvedBy: resolution?.by ?? null,
          resolutionNote: resolution?.note ?? null,
          resolvedAt: resolution ? new Date(resolution.at) : null,
          purchaseItemId: purchase?.itemId ?? null,
          purchasePaidValue: purchase?.paidValue ?? null,
          purchasedAt: purchase ? new Date(purchase.at) : null,
          createdAt: new Date(createdAt),
        };
      }),
    )
    .onConflictDoNothing();

  const historyRows = seedRequests.flatMap((r) =>
    r.history.map((h, idx) => ({
      id: `rh-${r.id}-${idx}`,
      requestId: r.id,
      progress: h.progress,
      byMemberId: h.by,
      at: new Date(h.at),
    })),
  );
  if (historyRows.length > 0) {
    await targetDb.insert(requestHistory).values(historyRows).onConflictDoNothing();
  }

  await targetDb
    .insert(loans)
    .values(
      seedLoans.map((l) => ({
        id: l.id,
        componentId: l.componentId,
        memberId: l.memberId,
        quantity: l.quantity,
        requestId: l.requestId,
        returnedAt: l.returnedAt ? new Date(l.returnedAt) : null,
      })),
    )
    .onConflictDoNothing();

  await targetDb.insert(evaluationCycles).values([SEED_CYCLES.previous, SEED_CYCLES.current]).onConflictDoNothing();

  await targetDb
    .insert(evaluations)
    .values(
      seedEvaluations.map((e) => ({
        id: e.id,
        cycle: e.cycle,
        evaluatorId: e.evaluatorId,
        evaluateeId: e.evaluateeId,
        ratings: e.ratings,
        comment: e.comment,
        submittedAt: new Date(e.submittedAt),
      })),
    )
    .onConflictDoNothing();
}

/**
 * Limpa e recarrega o banco de testes (uso exclusivo em `NODE_ENV=test`).
 */
export async function resetTestDatabase(targetDb: Database = db) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetTestDatabase só pode ser executada em ambiente de teste.");
  }
  await targetDb.execute(sql`
    TRUNCATE TABLE
      ${requestHistory},
      ${loans},
      ${resourceRequests},
      ${inventoryProposals},
      ${projectComponents},
      ${tasks},
      ${projectMembers},
      ${projects},
      ${inventoryItems},
      ${evaluations},
      ${evaluationCycles},
      ${scoreEntries},
      ${notifications},
      ${activities},
      ${eixoGoals},
      ${session},
      ${account},
      ${verification},
      ${user}
    RESTART IDENTITY CASCADE
  `);
  await seedDatabase(targetDb);
}

if (import.meta.main) {
  seedDatabase()
    .then(() => {
      console.log(`Seed concluído com sucesso. Senha padrão de desenvolvimento: ${SEED_PASSWORD}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erro ao executar seed:", err);
      process.exit(1);
    });
}
