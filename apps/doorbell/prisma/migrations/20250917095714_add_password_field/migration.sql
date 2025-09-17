-- AddMigration
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '123456';
