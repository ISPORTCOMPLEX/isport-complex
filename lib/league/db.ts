import 'server-only';
import { prisma } from '@/lib/prisma';

// Tabuľky súťaže – web si ich vytvorí sám pri prvom použití (rovnaké názvy ako z `prisma db push`).
const fk = (table: string, name: string, col: string, ref: string, onDelete: 'CASCADE' | 'RESTRICT' | 'SET NULL') =>
  `DO $$ BEGIN ALTER TABLE "${table}" ADD CONSTRAINT "${table}_${name}_fkey" FOREIGN KEY ("${col}") REFERENCES "${ref}"("id") ON DELETE ${onDelete} ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

// Pevné texty (žiadne údaje od používateľa) – spúšťajú sa cez Prisma.raw v jednom mieste nižšie.
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "LeagueTeam" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "short" TEXT NOT NULL, "city" TEXT NOT NULL DEFAULT '', "color" TEXT NOT NULL DEFAULT '#1f4fd8', "status" TEXT NOT NULL DEFAULT 'PENDING', "contactName" TEXT NOT NULL, "contactEmail" TEXT NOT NULL, "contactPhone" TEXT NOT NULL DEFAULT '', "note" TEXT NOT NULL DEFAULT '', "userId" TEXT, "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeagueTeam_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "LeagueTeam_status_idx" ON "LeagueTeam"("status")`,
  `CREATE TABLE IF NOT EXISTS "LeaguePlayer" ("id" TEXT NOT NULL, "teamId" TEXT NOT NULL, "name" TEXT NOT NULL, "number" INTEGER, "position" TEXT NOT NULL DEFAULT 'F', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LeaguePlayer_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "LeaguePlayer_teamId_idx" ON "LeaguePlayer"("teamId")`,
  `CREATE TABLE IF NOT EXISTS "LeagueGame" ("id" TEXT NOT NULL, "homeId" TEXT NOT NULL, "awayId" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'SCHEDULED', "homeScore" INTEGER, "awayScore" INTEGER, "decision" TEXT NOT NULL DEFAULT 'REG', "homeShots" INTEGER, "awayShots" INTEGER, "homeGoalieId" TEXT, "awayGoalieId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeagueGame_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "LeagueGame_startsAt_idx" ON "LeagueGame"("startsAt")`,
  `CREATE TABLE IF NOT EXISTS "LeagueGoal" ("id" TEXT NOT NULL, "gameId" TEXT NOT NULL, "teamId" TEXT NOT NULL, "scorerId" TEXT, "assist1Id" TEXT, "assist2Id" TEXT, "period" INTEGER NOT NULL, "time" TEXT NOT NULL DEFAULT '', "kind" TEXT NOT NULL DEFAULT 'EV', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LeagueGoal_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "LeagueGoal_gameId_idx" ON "LeagueGoal"("gameId")`,
  `ALTER TABLE "LeagueTeam" ADD COLUMN IF NOT EXISTS "logo" JSONB`,
  `ALTER TABLE "LeaguePlayer" ADD COLUMN IF NOT EXISTS "birthYear" INTEGER`,
  `ALTER TABLE "LeaguePlayer" ADD COLUMN IF NOT EXISTS "heightCm" INTEGER`,
  `ALTER TABLE "LeaguePlayer" ADD COLUMN IF NOT EXISTS "weightKg" INTEGER`,
  `ALTER TABLE "LeaguePlayer" ADD COLUMN IF NOT EXISTS "shoots" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "LeaguePlayer" ADD COLUMN IF NOT EXISTS "photo" JSONB`,
  `ALTER TABLE "LeagueGame" ADD COLUMN IF NOT EXISTS "homeLineup" JSONB`,
  `ALTER TABLE "LeagueGame" ADD COLUMN IF NOT EXISTS "awayLineup" JSONB`,
  `ALTER TABLE "LeagueGame" ADD COLUMN IF NOT EXISTS "confirmedBy" TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS "LeagueReport" ("id" TEXT NOT NULL, "gameId" TEXT NOT NULL, "teamId" TEXT NOT NULL, "userId" TEXT NOT NULL, "homeScore" INTEGER NOT NULL, "awayScore" INTEGER NOT NULL, "decision" TEXT NOT NULL DEFAULT 'REG', "shots" INTEGER, "goalieId" TEXT, "lineup" JSONB NOT NULL, "goals" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeagueReport_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LeagueReport_gameId_teamId_key" ON "LeagueReport"("gameId", "teamId")`,
  fk('LeagueReport', 'gameId', 'gameId', 'LeagueGame', 'CASCADE'),
  fk('LeagueReport', 'teamId', 'teamId', 'LeagueTeam', 'CASCADE'),
  fk('LeagueTeam', 'userId', 'userId', 'User', 'SET NULL'),
  fk('LeaguePlayer', 'teamId', 'teamId', 'LeagueTeam', 'CASCADE'),
  fk('LeagueGame', 'homeId', 'homeId', 'LeagueTeam', 'RESTRICT'),
  fk('LeagueGame', 'awayId', 'awayId', 'LeagueTeam', 'RESTRICT'),
  fk('LeagueGame', 'homeGoalieId', 'homeGoalieId', 'LeaguePlayer', 'SET NULL'),
  fk('LeagueGame', 'awayGoalieId', 'awayGoalieId', 'LeaguePlayer', 'SET NULL'),
  fk('LeagueGoal', 'gameId', 'gameId', 'LeagueGame', 'CASCADE'),
  fk('LeagueGoal', 'teamId', 'teamId', 'LeagueTeam', 'CASCADE'),
  fk('LeagueGoal', 'scorerId', 'scorerId', 'LeaguePlayer', 'SET NULL'),
  fk('LeagueGoal', 'assist1Id', 'assist1Id', 'LeaguePlayer', 'SET NULL'),
  fk('LeagueGoal', 'assist2Id', 'assist2Id', 'LeaguePlayer', 'SET NULL'),
];

let ready: Promise<void> | null = null;
export function ensureLeagueTables(): Promise<void> {
  ready ??= (async () => {
    const { Prisma } = await import('@prisma/client');
    for (const sql of DDL) await prisma.$executeRaw(Prisma.raw(sql));
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
