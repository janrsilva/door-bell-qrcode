-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address_uuid" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- Backfill existing embedded user addresses before making the relation required.
ALTER TABLE "users" ADD COLUMN "address_id" INTEGER;

INSERT INTO "addresses" (
    "street",
    "number",
    "complement",
    "neighborhood",
    "city",
    "state",
    "zip_code",
    "created_at",
    "updated_at"
)
SELECT DISTINCT
    "street",
    "number",
    "complement",
    "neighborhood",
    "city",
    "state",
    "zip_code",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users";

UPDATE "users" AS "u"
SET "address_id" = "a"."id"
FROM "addresses" AS "a"
WHERE "u"."street" = "a"."street"
  AND "u"."number" = "a"."number"
  AND "u"."complement" IS NOT DISTINCT FROM "a"."complement"
  AND "u"."neighborhood" = "a"."neighborhood"
  AND "u"."city" = "a"."city"
  AND "u"."state" = "a"."state"
  AND "u"."zip_code" = "a"."zip_code";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "users" WHERE "address_id" IS NULL) THEN
        RAISE EXCEPTION 'Failed to backfill users.address_id';
    END IF;
END $$;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "city",
DROP COLUMN "complement",
DROP COLUMN "house_number",
DROP COLUMN "neighborhood",
DROP COLUMN "number",
DROP COLUMN "state",
DROP COLUMN "street",
DROP COLUMN "zip_code",
ALTER COLUMN "address_id" SET NOT NULL,
ALTER COLUMN "password" DROP DEFAULT;

-- CreateTable
CREATE TABLE "doorbell_visits" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "address_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doorbell_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh_key" TEXT NOT NULL,
    "auth_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "addresses_address_uuid_key" ON "addresses"("address_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_street_number_complement_city_state_key" ON "addresses"("street", "number", "complement", "city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "doorbell_visits_uuid_key" ON "doorbell_visits"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "users_address_id_key" ON "users"("address_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doorbell_visits" ADD CONSTRAINT "doorbell_visits_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
