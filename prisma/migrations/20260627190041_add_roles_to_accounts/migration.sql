-- CreateEnum
CREATE TYPE "account_role_e" AS ENUM ('admin', 'user');

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "role" "account_role_e" NOT NULL DEFAULT 'user';
