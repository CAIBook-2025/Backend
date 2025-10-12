/*
  Warnings:

  - You are about to drop the column `date` on the `EventRequest` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `public_space_id` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `EventsScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `representativeId` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `GroupRequest` table. All the data in the column will be lost.
  - You are about to drop the column `availability` on the `PublicSpace` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `SRScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `srId` on the `SRScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `SRScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `SRScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SRScheduling` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Strike` table. All the data in the column will be lost.
  - You are about to drop the column `availability` on the `StudyRoom` table. All the data in the column will be lost.
  - You are about to drop the column `strikes` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `_GroupModerators` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[group_request_id]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[auth0_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `day` to the `EventRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module` to the `EventRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `EventsScheduling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `EventsScheduling` table without a default value. This is not possible if the table is not empty.
  - Made the column `event_request_id` on table `EventsScheduling` required. This step will fail if there are existing NULL values in that column.
  - Made the column `group_request_id` on table `Group` required. This step will fail if there are existing NULL values in that column.
  - Made the column `moderators_ids` on table `Group` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `user_id` to the `GroupRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `PublicSpace` table without a default value. This is not possible if the table is not empty.
  - Made the column `capacity` on table `PublicSpace` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `day` to the `SRScheduling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module` to the `SRScheduling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sr_id` to the `SRScheduling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `SRScheduling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Strike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `StudyRoom` table without a default value. This is not possible if the table is not empty.
  - Made the column `capacity` on table `StudyRoom` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `auth0_id` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `career` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_number` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."StrikeType" AS ENUM ('NO_SHOW', 'DAMAGE', 'MISUSE', 'OTHER');

-- DropForeignKey
ALTER TABLE "public"."EventsScheduling" DROP CONSTRAINT "EventsScheduling_event_request_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventsScheduling" DROP CONSTRAINT "EventsScheduling_group_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventsScheduling" DROP CONSTRAINT "EventsScheduling_public_space_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_group_request_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_representativeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupRequest" DROP CONSTRAINT "GroupRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SRScheduling" DROP CONSTRAINT "SRScheduling_srId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SRScheduling" DROP CONSTRAINT "SRScheduling_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_GroupModerators" DROP CONSTRAINT "_GroupModerators_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_GroupModerators" DROP CONSTRAINT "_GroupModerators_B_fkey";

-- DropIndex
DROP INDEX "public"."EventsScheduling_group_id_startsAt_idx";

-- DropIndex
DROP INDEX "public"."EventsScheduling_public_space_id_startsAt_endsAt_key";

-- DropIndex
DROP INDEX "public"."EventsScheduling_public_space_id_startsAt_idx";

-- DropIndex
DROP INDEX "public"."Group_name_key";

-- DropIndex
DROP INDEX "public"."GroupRequest_userId_status_idx";

-- DropIndex
DROP INDEX "public"."SRScheduling_srId_startsAt_endsAt_key";

-- DropIndex
DROP INDEX "public"."SRScheduling_srId_startsAt_idx";

-- DropIndex
DROP INDEX "public"."SRScheduling_userId_key";

-- DropIndex
DROP INDEX "public"."SRScheduling_userId_startsAt_idx";

-- AlterTable
ALTER TABLE "public"."EventRequest" DROP COLUMN "date",
ADD COLUMN     "day" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "module" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."EventsScheduling" DROP COLUMN "endsAt",
DROP COLUMN "group_id",
DROP COLUMN "notes",
DROP COLUMN "public_space_id",
DROP COLUMN "startsAt",
DROP COLUMN "status",
DROP COLUMN "title",
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "event_request_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Group" DROP COLUMN "description",
DROP COLUMN "name",
DROP COLUMN "representativeId",
ALTER COLUMN "group_request_id" SET NOT NULL,
ALTER COLUMN "moderators_ids" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupRequest" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."PublicSpace" DROP COLUMN "availability",
ADD COLUMN     "available" "public"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "location" TEXT NOT NULL,
ALTER COLUMN "capacity" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."SRScheduling" DROP COLUMN "endsAt",
DROP COLUMN "srId",
DROP COLUMN "startsAt",
DROP COLUMN "status",
DROP COLUMN "userId",
ADD COLUMN     "available" "public"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "day" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "module" INTEGER NOT NULL,
ADD COLUMN     "sr_id" INTEGER NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Strike" DROP COLUMN "reason",
ADD COLUMN     "type" "public"."StrikeType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."StudyRoom" DROP COLUMN "availability",
ADD COLUMN     "equipment" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "location" TEXT NOT NULL,
ALTER COLUMN "capacity" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "strikes",
ADD COLUMN     "auth0_id" TEXT NOT NULL,
ADD COLUMN     "career" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "student_number" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."_GroupModerators";

-- DropEnum
DROP TYPE "public"."ScheduleStatus";

-- DropEnum
DROP TYPE "public"."StrikeReason";

-- CreateIndex
CREATE INDEX "EventsScheduling_event_request_id_start_time_idx" ON "public"."EventsScheduling"("event_request_id", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "Group_group_request_id_key" ON "public"."Group"("group_request_id");

-- CreateIndex
CREATE INDEX "GroupRequest_user_id_status_idx" ON "public"."GroupRequest"("user_id", "status");

-- CreateIndex
CREATE INDEX "SRScheduling_sr_id_day_idx" ON "public"."SRScheduling"("sr_id", "day");

-- CreateIndex
CREATE INDEX "SRScheduling_user_id_day_idx" ON "public"."SRScheduling"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0_id_key" ON "public"."User"("auth0_id");

-- AddForeignKey
ALTER TABLE "public"."GroupRequest" ADD CONSTRAINT "GroupRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_group_request_id_fkey" FOREIGN KEY ("group_request_id") REFERENCES "public"."GroupRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRScheduling" ADD CONSTRAINT "SRScheduling_sr_id_fkey" FOREIGN KEY ("sr_id") REFERENCES "public"."StudyRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRScheduling" ADD CONSTRAINT "SRScheduling_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsScheduling" ADD CONSTRAINT "EventsScheduling_event_request_id_fkey" FOREIGN KEY ("event_request_id") REFERENCES "public"."EventRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
