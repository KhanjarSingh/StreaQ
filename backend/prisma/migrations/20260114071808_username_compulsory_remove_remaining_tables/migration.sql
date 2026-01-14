/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AccountabilityCircle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AccountabilityMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlobalProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Goal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OAuthAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Punishment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Streak` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AccountabilityCircle" DROP CONSTRAINT "AccountabilityCircle_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "AccountabilityMember" DROP CONSTRAINT "AccountabilityMember_circleId_fkey";

-- DropForeignKey
ALTER TABLE "AccountabilityMember" DROP CONSTRAINT "AccountabilityMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_platformProfileId_fkey";

-- DropForeignKey
ALTER TABLE "GlobalProfile" DROP CONSTRAINT "GlobalProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_platformProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "PlatformProfile" DROP CONSTRAINT "PlatformProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Punishment" DROP CONSTRAINT "Punishment_platformProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Punishment" DROP CONSTRAINT "Punishment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Streak" DROP CONSTRAINT "Streak_platformProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Streak" DROP CONSTRAINT "Streak_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "username" TEXT NOT NULL DEFAULT 'User';

-- DropTable
DROP TABLE "AccountabilityCircle";

-- DropTable
DROP TABLE "AccountabilityMember";

-- DropTable
DROP TABLE "Activity";

-- DropTable
DROP TABLE "GlobalProfile";

-- DropTable
DROP TABLE "Goal";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "OAuthAccount";

-- DropTable
DROP TABLE "PlatformProfile";

-- DropTable
DROP TABLE "Punishment";

-- DropTable
DROP TABLE "Streak";

-- DropEnum
DROP TYPE "MemberRole";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "OAuthProvider";

-- DropEnum
DROP TYPE "Platform";

-- DropEnum
DROP TYPE "ReminderFrequency";

-- DropEnum
DROP TYPE "ReminderTone";

-- DropEnum
DROP TYPE "StreakStatus";

-- DropEnum
DROP TYPE "StreakType";
