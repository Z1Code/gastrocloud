import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;

const sql = databaseUrl ? neon(databaseUrl) : neon("postgresql://placeholder:placeholder@localhost/placeholder");
export const db = drizzle(sql, { schema });
