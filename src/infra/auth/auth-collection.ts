import { Account } from "@/modules/identity/entities/account.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";

// oxlint-disable-next-line no-unused-vars needed for docstrings
import type { CurrentUser } from "@/infra/auth/decorators/current-user";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";

/**
 * Contains the authenticated user's account and professional profiles.
 * Extract it using {@link CurrentUser `CurrentUser`} decorator.
 */
export class AuthCollection {
  public constructor(
    public readonly account: Account,
    public readonly professionalProfiles: Professional[],
    public readonly patientProfile: Patient | undefined,
  ) {}
}
