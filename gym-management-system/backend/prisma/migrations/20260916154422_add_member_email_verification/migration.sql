-- CreateTable
CREATE TABLE "MemberEmailVerification" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberEmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberEmailVerification_memberId_key" ON "MemberEmailVerification"("memberId");

-- AddForeignKey
ALTER TABLE "MemberEmailVerification" ADD CONSTRAINT "MemberEmailVerification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
