import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from "./schema";
import { env } from 'process';

export interface Env {
  DB: DrizzleD1Database;
}

export const db = drizzle(env.DB, { schema });
