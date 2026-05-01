import { Account } from "@/modules/identity/entities/account.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";

export class AuthCollection {
  public constructor(
    public readonly account: Account,
    public readonly professionalProfiles: Professional[],
  ) {}
}
