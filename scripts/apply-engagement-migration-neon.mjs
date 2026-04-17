import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DIRECT_DATABASE_URL or DATABASE_URL");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);',
  'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "streakDayKey" TEXT;',
  'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "streakCount" INTEGER NOT NULL DEFAULT 0;',
  'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approvedSeenTotal" INTEGER NOT NULL DEFAULT 0;',
];

async function main() {
  for (const stmt of statements) {
    console.log("SQL:", stmt);
    await sql.query(stmt);
  }
  console.log("Engagement columns ensured.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
