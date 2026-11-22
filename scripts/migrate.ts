/** Applies db/schema.sql. Safe to run repeatedly. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";

async function main() {
  const db = await getDb();
  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await db.exec(schema);
  console.log(`[migrate] schema applied to ${db.kind}`);
}

main().catch((error) => {
  console.error("[migrate] failed", error);
  process.exit(1);
});
