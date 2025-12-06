/*
  Warnings:

  - You are about to drop the column `n_attendees` on the `EventRequest` table. All the data in the column will be lost.
  - You are about to drop the column `moderators_ids` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `GroupRequest` table. All the data in the column will be lost.
  - You are about to drop the column `hashed_password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `is_moderator` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventsScheduling` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `repre_id` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_event_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventsScheduling" DROP CONSTRAINT "EventsScheduling_event_request_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SRScheduling" DROP CONSTRAINT "SRScheduling_user_id_fkey";

-- AlterTable
ALTER TABLE "EventRequest" DROP COLUMN "n_attendees",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "moderators_ids",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repre_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "GroupRequest" DROP COLUMN "date",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "SRScheduling" ADD COLUMN     "is_finished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "hashed_password",
DROP COLUMN "is_moderator",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "public"."Attendance";

-- DropTable
DROP TABLE "public"."EventsScheduling";

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "rating" DECIMAL(2,1),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_student_id_event_id_idx" ON "Feedback"("student_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_student_id_event_id_key" ON "Feedback"("student_id", "event_id");

-- AddForeignKey
ALTER TABLE "SRScheduling" ADD CONSTRAINT "SRScheduling_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "EventRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
