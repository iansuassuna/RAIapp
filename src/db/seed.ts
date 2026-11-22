import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { type Database, db } from "./index";
import {
  account,
  activities,
  eixoGoals,
  eixoMetrics,
  evaluations,
  inventoryItems,
  inventoryProposals,
  loans,
  projectComponents,
  projectMembers,
  projects,
  requestHistory,
  resourceRequests,
  session,
  tasks,
  user,
  verification,
} from "./schema";
import {
  SEED_PASSWORD,
  seedActivities,
  seedEixoGoals,
  seedEixoMetrics,
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

  await targetDb
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
    .onConflictDoNothing();

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

  await targetDb.insert(eixoMetrics).values(seedEixoMetrics).onConflictDoNothing();

  await targetDb.insert(eixoGoals).values(seedEixoGoals).onConflictDoNothing();

  await targetDb.insert(activities).values(seedActivities).onConflictDoNothing();

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
      ${activities},
      ${eixoGoals},
      ${eixoMetrics},
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
