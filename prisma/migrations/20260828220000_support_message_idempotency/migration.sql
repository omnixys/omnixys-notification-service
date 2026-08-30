CREATE UNIQUE INDEX "uq_support_message_external"
ON "support_message"("conversationId", "external_id");
