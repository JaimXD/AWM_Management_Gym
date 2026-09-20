-- CreateTable
CREATE TABLE "MemberAccount" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPasswordReset" (
    "id" TEXT NOT NULL,
    "memberAccountId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "memberId" INTEGER,

    CONSTRAINT "MemberPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberAccount_memberId_key" ON "MemberAccount"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPasswordReset_tokenHash_key" ON "MemberPasswordReset"("tokenHash");

-- AddForeignKey
ALTER TABLE "MemberAccount" ADD CONSTRAINT "MemberAccount_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPasswordReset" ADD CONSTRAINT "MemberPasswordReset_memberAccountId_fkey" FOREIGN KEY ("memberAccountId") REFERENCES "MemberAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPasswordReset" ADD CONSTRAINT "MemberPasswordReset_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
