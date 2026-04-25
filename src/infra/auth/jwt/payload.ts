import { type UUID } from "@/common/uuid";

export class JwtPayload {
  public readonly sub!: UUID;
  public readonly name!: string;
}
