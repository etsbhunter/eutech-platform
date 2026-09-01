/*
  Warnings:

  - You are about to drop the column `clinicName` on the `DemoRequest` table. All the data in the column will be lost.
  - You are about to drop the `ClinicProfile` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyName` to the `DemoRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClinicProfile" DROP CONSTRAINT "ClinicProfile_organizationId_fkey";

-- AlterTable
ALTER TABLE "DemoRequest" DROP COLUMN "clinicName",
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "productSlug" TEXT;

-- DropTable
DROP TABLE "ClinicProfile";

-- CreateTable
CREATE TABLE "ProductProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductProfile_organizationId_productId_key" ON "ProductProfile"("organizationId", "productId");

-- AddForeignKey
ALTER TABLE "ProductProfile" ADD CONSTRAINT "ProductProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProfile" ADD CONSTRAINT "ProductProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
