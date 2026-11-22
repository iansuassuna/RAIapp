import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Aplica as migrations de `drizzle/` usando o migrador do próprio drizzle-orm (sem drizzle-kit em runtime).
 * Usado pelo serviço `migrate` do Docker Compose antes de subir o `app`. Idempotente.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

// Conexão única e sem NOTICEs ("já existe, ignorando") a cada execução repetida.
const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("Migrations aplicadas com sucesso.");
} catch (error) {
  console.error("Falha ao aplicar migrations:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
