-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'EXECUTED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentationKind" AS ENUM ('VIDEO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VERIFIED_ORIGINAL', 'VERIFIED_CONTENT_MATCH', 'UNABLE_TO_VERIFY', 'NO_MATCH', 'ERROR');

-- CreateEnum
CREATE TYPE "CheckSource" AS ENUM ('CUSTOMER_UPLOAD', 'ADMIN_UPLOAD', 'LOOKUP');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AiRiskLevel" AS ENUM ('NO_STRONG_SIGNALS', 'SOME_SIGNALS', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "show_customer_name" BOOLEAN NOT NULL DEFAULT false,
    "country_code" TEXT NOT NULL,
    "country_name_ar" TEXT NOT NULL,
    "service_type" TEXT,
    "execution_date" DATE NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'EXECUTED',
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentation" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "kind" "DocumentationKind" NOT NULL DEFAULT 'VIDEO',
    "storage_key" TEXT NOT NULL,
    "storage_driver" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "filesize" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration_seconds" DOUBLE PRECISION,
    "metadata_json" JSONB,
    "frame_hashes" JSONB,
    "audio_fingerprint" JSONB,
    "thumbnail_key" TEXT,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processing_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "download_allowed" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_links" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "verification_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_checks" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "documentation_id" TEXT,
    "source" "CheckSource" NOT NULL DEFAULT 'CUSTOMER_UPLOAD',
    "uploaded_filename" TEXT,
    "uploaded_file_hash" TEXT,
    "uploaded_filesize" BIGINT,
    "uploaded_mime_type" TEXT,
    "original_hash_match" BOOLEAN NOT NULL DEFAULT false,
    "similarity_score" DOUBLE PRECISION,
    "audio_similarity" DOUBLE PRECISION,
    "duration_delta" DOUBLE PRECISION,
    "ai_signal_score" DOUBLE PRECISION,
    "ai_risk_level" "AiRiskLevel",
    "ai_provider" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "result" "VerificationResult" NOT NULL DEFAULT 'UNABLE_TO_VERIFY',
    "report_json" JSONB,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processing_error" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "verification_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "detail" JSONB,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_country_code_idx" ON "orders"("country_code");

-- CreateIndex
CREATE INDEX "orders_execution_date_idx" ON "orders"("execution_date");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "documentation_order_id_idx" ON "documentation"("order_id");

-- CreateIndex
CREATE INDEX "documentation_sha256_idx" ON "documentation"("sha256");

-- CreateIndex
CREATE INDEX "documentation_processing_status_idx" ON "documentation"("processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "verification_links_verification_id_key" ON "verification_links"("verification_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_links_token_key" ON "verification_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_links_token_hash_key" ON "verification_links"("token_hash");

-- CreateIndex
CREATE INDEX "verification_links_order_id_idx" ON "verification_links"("order_id");

-- CreateIndex
CREATE INDEX "verification_checks_order_id_idx" ON "verification_checks"("order_id");

-- CreateIndex
CREATE INDEX "verification_checks_created_at_idx" ON "verification_checks"("created_at");

-- CreateIndex
CREATE INDEX "verification_checks_result_idx" ON "verification_checks"("result");

-- CreateIndex
CREATE INDEX "verification_checks_uploaded_file_hash_idx" ON "verification_checks"("uploaded_file_hash");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "audit_log_admin_id_idx" ON "audit_log"("admin_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets"("expires_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentation" ADD CONSTRAINT "documentation_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentation" ADD CONSTRAINT "documentation_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_links" ADD CONSTRAINT "verification_links_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_links" ADD CONSTRAINT "verification_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_documentation_id_fkey" FOREIGN KEY ("documentation_id") REFERENCES "documentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
