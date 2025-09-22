-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('STUDENT', 'REPRESENTATIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STUDENT',
    "is_representative" BOOLEAN NOT NULL DEFAULT false,
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "representativeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudyRoom" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicSpace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SRScheduling" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "srId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SRScheduling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventsScheduling" (
    "id" SERIAL NOT NULL,
    "psId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventsScheduling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_GroupModerators" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GroupModerators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "public"."Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudyRoom_name_key" ON "public"."StudyRoom"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PublicSpace_name_key" ON "public"."PublicSpace"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SRScheduling_userId_key" ON "public"."SRScheduling"("userId");

-- CreateIndex
CREATE INDEX "SRScheduling_srId_startsAt_idx" ON "public"."SRScheduling"("srId", "startsAt");

-- CreateIndex
CREATE INDEX "SRScheduling_userId_startsAt_idx" ON "public"."SRScheduling"("userId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SRScheduling_srId_startsAt_endsAt_key" ON "public"."SRScheduling"("srId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "EventsScheduling_psId_startsAt_idx" ON "public"."EventsScheduling"("psId", "startsAt");

-- CreateIndex
CREATE INDEX "EventsScheduling_groupId_startsAt_idx" ON "public"."EventsScheduling"("groupId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventsScheduling_psId_startsAt_endsAt_key" ON "public"."EventsScheduling"("psId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "_GroupModerators_B_index" ON "public"."_GroupModerators"("B");

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRScheduling" ADD CONSTRAINT "SRScheduling_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRScheduling" ADD CONSTRAINT "SRScheduling_srId_fkey" FOREIGN KEY ("srId") REFERENCES "public"."StudyRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsScheduling" ADD CONSTRAINT "EventsScheduling_psId_fkey" FOREIGN KEY ("psId") REFERENCES "public"."PublicSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsScheduling" ADD CONSTRAINT "EventsScheduling_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_GroupModerators" ADD CONSTRAINT "_GroupModerators_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_GroupModerators" ADD CONSTRAINT "_GroupModerators_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
