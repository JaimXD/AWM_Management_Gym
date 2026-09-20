-- CreateEnum
CREATE TYPE "ExerciseMediaType" AS ENUM ('IMAGE', 'GIF');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "mediaType" "ExerciseMediaType" NOT NULL DEFAULT 'IMAGE';

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "dayOfWeek" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WorkoutExerciseCompletion" (
    "id" SERIAL NOT NULL,
    "workoutExerciseId" INTEGER NOT NULL,
    "completedDate" DATE NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutExerciseCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutExerciseCompletion_completedDate_idx" ON "WorkoutExerciseCompletion"("completedDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExerciseCompletion_workoutExerciseId_completedDate_key" ON "WorkoutExerciseCompletion"("workoutExerciseId", "completedDate");

-- AddForeignKey
ALTER TABLE "WorkoutExerciseCompletion" ADD CONSTRAINT "WorkoutExerciseCompletion_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
