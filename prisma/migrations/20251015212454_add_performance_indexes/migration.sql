-- CreateIndex
CREATE INDEX "Account_type_status_idx" ON "public"."Account"("type", "status");

-- CreateIndex
CREATE INDEX "Account_userId_type_idx" ON "public"."Account"("userId", "type");

-- CreateIndex
CREATE INDEX "Customer_accountId_status_idx" ON "public"."Customer"("accountId", "status");

-- CreateIndex
CREATE INDEX "Entity_categoryId_type_idx" ON "public"."Entity"("categoryId", "type");

-- CreateIndex
CREATE INDEX "Entity_brandId_type_idx" ON "public"."Entity"("brandId", "type");

-- CreateIndex
CREATE INDEX "Entity_setId_idx" ON "public"."Entity"("setId");

-- CreateIndex
CREATE INDEX "Listing_status_price_idx" ON "public"."Listing"("status", "price");

-- CreateIndex
CREATE INDEX "Listing_entityId_status_idx" ON "public"."Listing"("entityId", "status");

-- CreateIndex
CREATE INDEX "Listing_accountId_status_idx" ON "public"."Listing"("accountId", "status");

-- CreateIndex
CREATE INDEX "Listing_conditionId_idx" ON "public"."Listing"("conditionId");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "public"."Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_status_idx" ON "public"."Order"("customerId", "status");

-- CreateIndex
CREATE INDEX "Order_sellerId_status_idx" ON "public"."Order"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Transaction_accountId_transactionType_idx" ON "public"."Transaction"("accountId", "transactionType");

-- CreateIndex
CREATE INDEX "Transaction_transactionType_createdAt_idx" ON "public"."Transaction"("transactionType", "createdAt");
