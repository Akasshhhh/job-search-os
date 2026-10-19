import { PrismaClient } from "@prisma/client";
import { savedJobSchema, type SavedJob } from "@/src/domain/job";

const globalDatabase = globalThis as unknown as { jobsDatabase?: PrismaClient };
const database = globalDatabase.jobsDatabase ?? new PrismaClient(
  process.env.DATABASE_URL ? { datasourceUrl: process.env.DATABASE_URL } : undefined
);
if (process.env.NODE_ENV !== "production") globalDatabase.jobsDatabase = database;

/** The only module that knows how job records are stored. */
export function jobsRepository(client: PrismaClient = database) {
  return {
    async listJobs(): Promise<SavedJob[]> {
      const records = await client.job.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      return records.map((record) => savedJobSchema.parse({
        ...record,
        createdAt: record.createdAt.toISOString()
      }));
    },
    async saveJob(value: SavedJob): Promise<SavedJob> {
      const job = savedJobSchema.parse(value);
      await client.job.create({ data: { ...job, createdAt: new Date(job.createdAt) } });
      return job;
    }
  };
}

export const { listJobs, saveJob } = jobsRepository();
