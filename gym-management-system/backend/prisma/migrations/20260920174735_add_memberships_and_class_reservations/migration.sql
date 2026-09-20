-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVADA', 'CANCELADA', 'ASISTIO');

-- CreateTable
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "planName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVA',
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassReservation" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVADA',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "userId" INTEGER,

    CONSTRAINT "ClassReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_memberId_expiresAt_idx" ON "Membership"("memberId", "expiresAt");

-- CreateIndex
CREATE INDEX "ClassReservation_memberId_status_idx" ON "ClassReservation"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassReservation_classId_memberId_key" ON "ClassReservation"("classId", "memberId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReservation" ADD CONSTRAINT "ClassReservation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReservation" ADD CONSTRAINT "ClassReservation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReservation" ADD CONSTRAINT "ClassReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
