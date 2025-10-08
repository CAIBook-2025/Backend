-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('STUDENT', 'REPRESENTATIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."StrikeReason" AS ENUM ('NO_SHOW', 'DAMAGE', 'MISUSE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STUDENT',
    "is_representative" BOOLEAN NOT NULL DEFAULT false,
    "is_moderator" BOOLEAN NOT NULL DEFAULT false,
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reputation" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "representativeId" INTEGER NOT NULL,
    "group_request_id" INTEGER,
    "moderators_ids" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudyRoom" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "availability" "public"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicSpace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "availability" "public"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
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
CREATE TABLE "public"."EventRequest" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "public_space_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "n_attendees" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventsScheduling" (
    "id" SERIAL NOT NULL,
    "public_space_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "event_request_id" INTEGER,
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
CREATE TABLE "public"."Strike" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "public"."StrikeReason" NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "rating" DECIMAL(2,1),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "GroupRequest_userId_status_idx" ON "public"."GroupRequest"("userId", "status");

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
CREATE INDEX "EventRequest_group_id_status_idx" ON "public"."EventRequest"("group_id", "status");

-- CreateIndex
CREATE INDEX "EventsScheduling_public_space_id_startsAt_idx" ON "public"."EventsScheduling"("public_space_id", "startsAt");

-- CreateIndex
CREATE INDEX "EventsScheduling_group_id_startsAt_idx" ON "public"."EventsScheduling"("group_id", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventsScheduling_public_space_id_startsAt_endsAt_key" ON "public"."EventsScheduling"("public_space_id", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Strike_student_id_date_idx" ON "public"."Strike"("student_id", "date");

-- CreateIndex
CREATE INDEX "Attendance_student_id_event_id_idx" ON "public"."Attendance"("student_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_student_id_event_id_key" ON "public"."Attendance"("student_id", "event_id");

-- CreateIndex
CREATE INDEX "_GroupModerators_B_index" ON "public"."_GroupModerators"("B");

-- AddForeignKey
ALTER TABLE "public"."GroupRequest" ADD CONSTRAINT "GroupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_group_request_id_fkey" FOREIGN KEY ("group_request_id") REFERENCES "public"."GroupRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRScheduling" ADD CONSTRAINT "SRScheduling_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRScheduling" ADD CONSTRAINT "SRScheduling_srId_fkey" FOREIGN KEY ("srId") REFERENCES "public"."StudyRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRequest" ADD CONSTRAINT "EventRequest_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRequest" ADD CONSTRAINT "EventRequest_public_space_id_fkey" FOREIGN KEY ("public_space_id") REFERENCES "public"."PublicSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsScheduling" ADD CONSTRAINT "EventsScheduling_public_space_id_fkey" FOREIGN KEY ("public_space_id") REFERENCES "public"."PublicSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsScheduling" ADD CONSTRAINT "EventsScheduling_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsScheduling" ADD CONSTRAINT "EventsScheduling_event_request_id_fkey" FOREIGN KEY ("event_request_id") REFERENCES "public"."EventRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Strike" ADD CONSTRAINT "Strike_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Strike" ADD CONSTRAINT "Strike_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."EventsScheduling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_GroupModerators" ADD CONSTRAINT "_GroupModerators_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_GroupModerators" ADD CONSTRAINT "_GroupModerators_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;