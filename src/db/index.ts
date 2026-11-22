import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function resolveDatabaseUrl() {
  if (process.env.NODE_ENV === "test" && process.env.DATABASE_URL_TEST) {
    return process.env.DATABASE_URL_TEST;
  }
  return process.env.DATABASE_URL ?? "postgres://raiapp:raiapp@localhost:5433/raiapp";
}

type DbSingleton = {
  client: ReturnType<typeof postgres>;
  db: ReturnType<typeof drizzle<typeof schema>>;
  url: string;
};

const KEY = "__raiappDrizzle";
const globalStore = globalThis as typeof globalThis & { [KEY]?: DbSingleton };

function createInstance(url: string): DbSingleton {
  const client = postgres(url, {
    max: process.env.NODE_ENV === "test" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return { client, db: drizzle(client, { schema }), url };
}

function getSingleton(): DbSingleton {
  const url = resolveDatabaseUrl();
  if (!globalStore[KEY] || globalStore[KEY].url !== url) {
    globalStore[KEY] = createInstance(url);
  }
  return globalStore[KEY];
}

export const db = getSingleton().db;
export const sqlClient = getSingleton().client;

export type Database = typeof db;
export type DbOrTx = Pick<Database, "select" | "insert" | "update" | "delete" | "execute">;

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
