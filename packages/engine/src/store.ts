import { randomUUID } from "node:crypto";
import type { Job, JobStatus } from "@deck/shared";
import pg from "pg";

export type SlideWrite = "ok" | "conflict";

export interface Store {
  insertJob(input: {
    markdown: string;
    contentHash: string;
    slideCount: number;
  }): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  putSlide(
    jobId: string,
    index: number,
    png: Buffer,
    replicaId: string,
  ): Promise<SlideWrite>;
  putPdf(jobId: string, pdf: Buffer): Promise<void>;
  getSlide(jobId: string, index: number): Promise<Buffer | null>;
  getPdf(jobId: string): Promise<Buffer | null>;
  queueDepth(): Promise<number>;
}

type MemoryJob = Job & { slides: Map<number, Buffer>; pdf: Buffer | null };

export function createMemoryStore(): Store {
  const jobs = new Map<string, MemoryJob>();

  return {
    async insertJob({ markdown, contentHash, slideCount }) {
      const job: MemoryJob = {
        id: randomUUID(),
        contentHash,
        markdown,
        status: "queued",
        slideCount,
        createdAt: new Date().toISOString(),
        slides: new Map(),
        pdf: null,
      };
      jobs.set(job.id, job);
      return job;
    },
    async getJob(id) {
      const row = jobs.get(id);
      if (!row) return null;
      const { slides: _s, pdf: _p, ...job } = row;
      return job;
    },
    async updateStatus(id, status) {
      const row = jobs.get(id);
      if (row) row.status = status;
    },
    async putSlide(jobId, index, png) {
      const row = jobs.get(jobId);
      if (!row) return "ok";
      if (row.slides.has(index)) return "conflict";
      row.slides.set(index, png);
      return "ok";
    },
    async putPdf(jobId, pdf) {
      const row = jobs.get(jobId);
      if (row) row.pdf = pdf;
    },
    async getSlide(jobId, index) {
      return jobs.get(jobId)?.slides.get(index) ?? null;
    },
    async getPdf(jobId) {
      return jobs.get(jobId)?.pdf ?? null;
    },
    async queueDepth() {
      return [...jobs.values()].filter(
        (job) => job.status === "queued" || job.status === "rendering",
      ).length;
    },
  };
}

const MIGRATION = `
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY,
  content_hash TEXT NOT NULL,
  markdown TEXT NOT NULL,
  status TEXT NOT NULL,
  slide_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS slides (
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  slide_index INT NOT NULL,
  png BYTEA NOT NULL,
  replica_id TEXT NOT NULL,
  PRIMARY KEY (job_id, slide_index)
);
CREATE TABLE IF NOT EXISTS job_pdfs (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  pdf BYTEA NOT NULL
);
`;

export type PostgresOptions = {
  /** Schema to work in instead of public. Lets a dev deployment share the database with stage without sharing rows. */
  schema?: string;
  /** Credentials allowed to CREATE SCHEMA. The default Zerops user cannot, so the superuser pair is used only for that one statement. */
  admin?: { user: string; password: string };
  /** Database the schema lives in. The Zerops connection string has no path, so this comes from the service's dbName variable. */
  database?: string;
};

export function postgresOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): PostgresOptions {
  const schema = env.DECK_DB_SCHEMA?.trim();
  const admin =
    env.DB_ADMIN_USER && env.DB_ADMIN_PASSWORD
      ? { user: env.DB_ADMIN_USER, password: env.DB_ADMIN_PASSWORD }
      : undefined;
  return { schema: schema || undefined, admin, database: env.DB_NAME?.trim() || undefined };
}

function clientConfig(databaseUrl: string, schema?: string): pg.ClientConfig {
  return schema
    ? { connectionString: databaseUrl, options: `-c search_path=${schema}` }
    : { connectionString: databaseUrl };
}

// pg lets a connection string override explicit user and password, so the admin connection is built from discrete fields instead.
async function ensureSchema(databaseUrl: string, schema: string, options: PostgresOptions): Promise<void> {
  const { admin } = options;
  const url = new URL(databaseUrl);
  const owner = decodeURIComponent(url.username);
  // Without a path in the URL pg uses the user name as the database, so the admin connection must be told the owner's database explicitly.
  // Otherwise the superuser lands in its own database and creates the schema there. Order: URL path, DB_NAME, then pg's own default.
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")) || options.database || owner;
  const client = new pg.Client({
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database,
    user: admin?.user ?? owner,
    password: admin?.password ?? decodeURIComponent(url.password),
  });
  await client.connect();
  try {
    const schemaId = pg.escapeIdentifier(schema);
    const ownerId = pg.escapeIdentifier(owner);
    // IF NOT EXISTS skips AUTHORIZATION when the schema already exists, so ownership and grants are applied explicitly every time.
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaId} AUTHORIZATION ${ownerId}`);
    await client.query(`ALTER SCHEMA ${schemaId} OWNER TO ${ownerId}`);
    await client.query(`GRANT ALL ON SCHEMA ${schemaId} TO ${ownerId}`);
    const { rows } = await client.query<{ db: string; who: string }>(
      `SELECT current_database() AS db, current_user AS who`,
    );
    console.log(
      `schema ${schema} ready in database ${rows[0]?.db} owned by ${owner} (bootstrapped as ${rows[0]?.who})`,
    );
  } finally {
    await client.end();
  }
}

// Fails with a readable message when the schema is not usable on the normal connection, instead of a bare 3F000 from CREATE TABLE.
async function assertSchemaUsable(client: pg.Client, schema: string): Promise<void> {
  const { rows } = await client.query<{ db: string; who: string; current: string | null }>(
    `SELECT current_database() AS db, current_user AS who, current_schema() AS current`,
  );
  const state = rows[0];
  if (state?.current === schema) return;
  const { rows: schemas } = await client.query<{ name: string; owner: string }>(
    `SELECT nspname AS name, pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' ORDER BY 1`,
  );
  const listing = schemas.map((row) => `${row.name} (owner ${row.owner})`).join(", ");
  throw new Error(
    `schema ${schema} is not usable by ${state?.who} in database ${state?.db}: current_schema() is ${state?.current ?? "null"}. Schemas present: ${listing || "none"}`,
  );
}

export async function migratePostgres(
  databaseUrl: string,
  options: PostgresOptions = postgresOptionsFromEnv(),
): Promise<void> {
  if (options.schema) await ensureSchema(databaseUrl, options.schema, options);
  const client = new pg.Client(clientConfig(databaseUrl, options.schema));
  await client.connect();
  try {
    if (options.schema) await assertSchemaUsable(client, options.schema);
    await client.query(MIGRATION);
  } finally {
    await client.end();
  }
}

export function createPostgresStore(
  databaseUrl: string,
  options: PostgresOptions = postgresOptionsFromEnv(),
): Store {
  const pool = new pg.Pool(clientConfig(databaseUrl, options.schema));

  return {
    async insertJob({ markdown, contentHash, slideCount }) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO jobs (id, content_hash, markdown, status, slide_count, created_at)
         VALUES ($1, $2, $3, 'queued', $4, $5)`,
        [id, contentHash, markdown, slideCount, createdAt],
      );
      return {
        id,
        contentHash,
        markdown,
        status: "queued",
        slideCount,
        createdAt,
      };
    },
    async getJob(id) {
      const { rows } = await pool.query(
        `SELECT id, content_hash, markdown, status, slide_count, created_at
         FROM jobs WHERE id = $1`,
        [id],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        contentHash: row.content_hash,
        markdown: row.markdown,
        status: row.status,
        slideCount: row.slide_count,
        createdAt: new Date(row.created_at).toISOString(),
      };
    },
    async updateStatus(id, status) {
      await pool.query(`UPDATE jobs SET status = $2 WHERE id = $1`, [id, status]);
    },
    async putSlide(jobId, index, png, replicaId) {
      try {
        await pool.query(
          `INSERT INTO slides (job_id, slide_index, png, replica_id)
           VALUES ($1, $2, $3, $4)`,
          [jobId, index, png, replicaId],
        );
        return "ok";
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "23505") return "conflict";
        throw err;
      }
    },
    async putPdf(jobId, pdf) {
      await pool.query(
        `INSERT INTO job_pdfs (job_id, pdf) VALUES ($1, $2)
         ON CONFLICT (job_id) DO UPDATE SET pdf = EXCLUDED.pdf`,
        [jobId, pdf],
      );
    },
    async getSlide(jobId, index) {
      const { rows } = await pool.query(
        `SELECT png FROM slides WHERE job_id = $1 AND slide_index = $2`,
        [jobId, index],
      );
      return rows[0] ? Buffer.from(rows[0].png) : null;
    },
    async getPdf(jobId) {
      const { rows } = await pool.query(
        `SELECT pdf FROM job_pdfs WHERE job_id = $1`,
        [jobId],
      );
      return rows[0] ? Buffer.from(rows[0].pdf) : null;
    },
    async queueDepth() {
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM jobs WHERE status IN ('queued', 'rendering')`,
      );
      return rows[0]?.n ?? 0;
    },
  };
}
