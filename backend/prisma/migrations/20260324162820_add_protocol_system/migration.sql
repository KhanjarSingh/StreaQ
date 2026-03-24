-- CreateEnum
CREATE TYPE "ProtocolType" AS ENUM ('GITHUB', 'LEETCODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('FIFTEEN_MINUTES', 'THIRTY_MINUTES', 'ONE_HOUR');

-- CreateEnum
CREATE TYPE "PunishmentLevel" AS ENUM ('STRICT', 'HARSH', 'RELENTLESS');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "dailyDeadline" TEXT NOT NULL DEFAULT '22:30',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "protocolType" "ProtocolType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "punishmentLevel" "PunishmentLevel" NOT NULL DEFAULT 'STRICT',
ADD COLUMN     "reminderFrequency" "ReminderFrequency" NOT NULL DEFAULT 'THIRTY_MINUTES',
ADD COLUMN     "requiresConfiguration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetValue" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT;
