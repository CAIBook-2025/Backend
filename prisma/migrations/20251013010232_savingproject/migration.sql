/*
  Warnings:

  - You are about to drop the column `date` on the `GroupRequest` table. All the data in the column will be lost.
  - You are about to drop the column `hashed_password` on the `User` table. All the data in the column will be lost.
  - Added the required column `repre_id` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- DropForeignKey
ALTER TABLE "public"."SRScheduling" DROP CONSTRAINT "SRScheduling_user_id_fkey";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "repre_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "GroupRequest" DROP COLUMN "date",
ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "SRScheduling" ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "hashed_password";

-- AddForeignKey
ALTER TABLE "SRScheduling" ADD CONSTRAINT "SRScheduling_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
