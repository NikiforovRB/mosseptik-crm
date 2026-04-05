-- Communication kind + task assignee snapshot; nullable client status pills
CREATE TYPE "CommunicationKind" AS ENUM ('STANDARD', 'TASK_COMPLETED');

ALTER TABLE "Communication"
  ADD COLUMN "kind" "CommunicationKind" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "taskAssigneeLabel" TEXT;

ALTER TABLE "Client"
  ALTER COLUMN "qualified" DROP DEFAULT,
  ALTER COLUMN "qualified" DROP NOT NULL,
  ALTER COLUMN "moneyProgress" DROP DEFAULT,
  ALTER COLUMN "moneyProgress" DROP NOT NULL,
  ALTER COLUMN "gsoType" DROP DEFAULT,
  ALTER COLUMN "gsoType" DROP NOT NULL;
