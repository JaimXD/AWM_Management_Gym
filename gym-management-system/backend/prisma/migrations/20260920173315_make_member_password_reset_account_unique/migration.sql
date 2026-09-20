/*
  Warnings:

  - A unique constraint covering the columns `[memberAccountId]` on the table `MemberPasswordReset` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MemberPasswordReset_memberAccountId_key" ON "MemberPasswordReset"("memberAccountId");
