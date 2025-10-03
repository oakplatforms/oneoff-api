-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "public"."Account"("type");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "public"."Account"("status");

-- CreateIndex
CREATE INDEX "Admin_userId_idx" ON "public"."Admin"("userId");

-- CreateIndex
CREATE INDEX "Bid_accountId_idx" ON "public"."Bid"("accountId");

-- CreateIndex
CREATE INDEX "Bid_entityId_idx" ON "public"."Bid"("entityId");

-- CreateIndex
CREATE INDEX "Bid_status_idx" ON "public"."Bid"("status");

-- CreateIndex
CREATE INDEX "Customer_accountId_idx" ON "public"."Customer"("accountId");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "public"."Customer"("status");

-- CreateIndex
CREATE INDEX "Entity_categoryId_idx" ON "public"."Entity"("categoryId");

-- CreateIndex
CREATE INDEX "Entity_brandId_idx" ON "public"."Entity"("brandId");

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "public"."Entity"("type");

-- CreateIndex
CREATE INDEX "EntityList_listId_idx" ON "public"."EntityList"("listId");

-- CreateIndex
CREATE INDEX "EntityList_entityId_idx" ON "public"."EntityList"("entityId");

-- CreateIndex
CREATE INDEX "EntityTag_tagId_idx" ON "public"."EntityTag"("tagId");

-- CreateIndex
CREATE INDEX "EntityTag_entityId_idx" ON "public"."EntityTag"("entityId");

-- CreateIndex
CREATE INDEX "EntityTag_tagValue_idx" ON "public"."EntityTag"("tagValue");

-- CreateIndex
CREATE INDEX "List_accountId_idx" ON "public"."List"("accountId");

-- CreateIndex
CREATE INDEX "List_type_idx" ON "public"."List"("type");

-- CreateIndex
CREATE INDEX "List_isPrivate_idx" ON "public"."List"("isPrivate");

-- CreateIndex
CREATE INDEX "Listing_accountId_idx" ON "public"."Listing"("accountId");

-- CreateIndex
CREATE INDEX "Listing_entityId_idx" ON "public"."Listing"("entityId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "public"."Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_price_idx" ON "public"."Listing"("price");

-- CreateIndex
CREATE INDEX "Offer_bidId_idx" ON "public"."Offer"("bidId");

-- CreateIndex
CREATE INDEX "Offer_listingId_idx" ON "public"."Offer"("listingId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "public"."Offer"("status");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_sellerId_idx" ON "public"."Order"("sellerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Profile_accountId_idx" ON "public"."Profile"("accountId");

-- CreateIndex
CREATE INDEX "Review_accountId_idx" ON "public"."Review"("accountId");

-- CreateIndex
CREATE INDEX "Review_entityId_idx" ON "public"."Review"("entityId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "public"."Review"("rating");

-- CreateIndex
CREATE INDEX "Seller_accountId_idx" ON "public"."Seller"("accountId");

-- CreateIndex
CREATE INDEX "Seller_status_idx" ON "public"."Seller"("status");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "public"."Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_orderId_idx" ON "public"."Transaction"("orderId");

-- CreateIndex
CREATE INDEX "Transaction_transactionType_idx" ON "public"."Transaction"("transactionType");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "User_authId_idx" ON "public"."User"("authId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");
