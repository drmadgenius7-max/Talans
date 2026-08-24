-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN     "payerMemberId" TEXT,
ADD COLUMN     "requesterMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requesterMemberId_fkey" FOREIGN KEY ("requesterMemberId") REFERENCES "GroupMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "GroupMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
