import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { session, user } from "@/db/schema";
import type { Member } from "@/types";

export type ProfileSession = {
  id: string;
  /** ISO 8601 (serializável para componentes cliente). */
  createdAt: string;
  lastActiveAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  current: boolean;
};

export type Profile = {
  emailVerified: boolean;
  sessions: ProfileSession[];
};

/** Dados da tela "Meu perfil". Sempre do próprio `viewer` (não existe leitura de perfil alheio). */
export async function getProfile(viewer: Member, currentSessionId: string): Promise<Profile> {
  const [account] = await db.select({ emailVerified: user.emailVerified }).from(user).where(eq(user.id, viewer.id));

  const rows = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    })
    .from(session)
    .where(and(eq(session.userId, viewer.id), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt));

  const sessions = rows
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      lastActiveAt: r.updatedAt.toISOString(),
      userAgent: r.userAgent,
      ipAddress: r.ipAddress,
      current: r.id === currentSessionId,
    }))
    // Sessão atual primeiro.
    .sort((a, b) => Number(b.current) - Number(a.current));

  return { emailVerified: account?.emailVerified ?? false, sessions };
}
