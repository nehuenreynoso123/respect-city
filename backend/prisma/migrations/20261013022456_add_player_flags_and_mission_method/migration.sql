-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "method" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "routineSeeded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sound" BOOLEAN NOT NULL DEFAULT true;
