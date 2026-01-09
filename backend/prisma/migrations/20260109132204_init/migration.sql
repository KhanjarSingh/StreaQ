-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GITHUB', 'LEETCODE', 'CODEFORCES', 'HACKERRANK', 'CODECHEF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GITHUB', 'GOOGLE');

-- CreateEnum
CREATE TYPE "ReminderTone" AS ENUM ('SUPPORTIVE', 'NEUTRAL', 'HARSH', 'FUNNY');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "StreakType" AS ENUM ('GLOBAL', 'PLATFORM');

-- CreateEnum
CREATE TYPE "StreakStatus" AS ENUM ('ACTIVE', 'BROKEN', 'PAUSED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REMINDER', 'STREAK_WARNING', 'ACHIEVEMENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "username" TEXT,
    "reminderTone" "ReminderTone" NOT NULL,
    "reminderFrequency" "ReminderFrequency" NOT NULL,
    "strictnessLevel" INTEGER NOT NULL,
    "totalActiveDays" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderTone" "ReminderTone" NOT NULL,
    "reminderFrequency" "ReminderFrequency" NOT NULL,
    "strictnessLevel" INTEGER NOT NULL,
    "totalActiveDays" INTEGER NOT NULL DEFAULT 0,
    "freezeDaysLeft" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "platformProfileId" TEXT NOT NULL,
    "target" JSONB NOT NULL,
    "frequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "platformProfileId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformProfileId" TEXT,
    "type" "StreakType" NOT NULL,
    "currentLength" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "status" "StreakStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punishment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformProfileId" TEXT,
    "level" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "restrictedApps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Punishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountabilityCircle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountabilityCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountabilityMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountabilityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerId_key" ON "OAuthAccount"("provider", "providerId");

-- CreateIndex
CREATE INDEX "PlatformProfile_userId_idx" ON "PlatformProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformProfile_platform_platformUserId_key" ON "PlatformProfile"("platform", "platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalProfile_userId_key" ON "GlobalProfile"("userId");

-- CreateIndex
CREATE INDEX "Goal_platformProfileId_isActive_idx" ON "Goal"("platformProfileId", "isActive");

-- CreateIndex
CREATE INDEX "Activity_platformProfileId_activityDate_idx" ON "Activity"("platformProfileId", "activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountabilityMember_userId_circleId_key" ON "AccountabilityMember"("userId", "circleId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformProfile" ADD CONSTRAINT "PlatformProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProfile" ADD CONSTRAINT "GlobalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "PlatformProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "PlatformProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "PlatformProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "PlatformProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountabilityCircle" ADD CONSTRAINT "AccountabilityCircle_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountabilityMember" ADD CONSTRAINT "AccountabilityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountabilityMember" ADD CONSTRAINT "AccountabilityMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "AccountabilityCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
