-- DropIndex
DROP INDEX "Subscription_providerSubscriptionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
