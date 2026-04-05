import type { Client, Funnel, FunnelStage, SepticModel, User } from "@prisma/client";

export type KanbanClient = Pick<
  Client,
  | "id"
  | "firstName"
  | "lastName"
  | "middleName"
  | "shortComment"
  | "qualified"
  | "moneyProgress"
  | "gsoType"
  | "isUrgent"
  | "lastCommunicationAt"
  | "funnelStageId"
  | "orderInStage"
  | "assignedManagerId"
> & {
  septicModel: Pick<SepticModel, "id" | "name"> | null;
  assignedManager: Pick<User, "id" | "firstName" | "lastName"> | null;
  /** Serialized from server; dueAt is ISO string or null. */
  nextTask: { dueAt: string | null; dueHasTime: boolean } | null;
};

export type KanbanStage = Pick<FunnelStage, "id" | "name" | "order" | "headerColor" | "funnelId"> & {
  clients: KanbanClient[];
};

export type KanbanFunnel = Pick<Funnel, "id" | "name"> & {
  stages: KanbanStage[];
};

