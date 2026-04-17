import { v7, type UUIDTypes } from "uuid";

export type UUID = UUIDTypes;

export function generateUUID() {
  return v7();
}
