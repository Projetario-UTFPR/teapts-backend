import { AuthCollection } from "@/infra/auth/auth-collection";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ApiProperty } from "@nestjs/swagger";

class AuthCollectionAccountPresenter {
  @ApiProperty({
    description: "The identifier of the authenticated user within the system.",
    format: "uuid",
  })
  public readonly id!: string;

  @ApiProperty({ description: "The name of the authenticated user." })
  public readonly name!: string;

  @ApiProperty({
    description: "The role of this account within the system.",
    enum: Account.Role,
    example: Account.Role.User,
  })
  public readonly role!: string;

  public constructor(props: AuthCollectionAccountPresenter) {
    Object.assign(this, props);
  }

  public static present(account: Account) {
    return new AuthCollectionAccountPresenter({
      id: account.getId().toString(),
      name: account.getName(),
      role: account.getRole(),
    });
  }
}

class AuthCollectionProfessionalProfilePresenter {
  @ApiProperty({
    description: "The identifier of this professional profile within the system.",
    format: "uuid",
  })
  public readonly professionalId!: string;

  @ApiProperty({
    description: "The specialism of this professional profile.",
    enum: [Object.values(Professional.Specialism)],
  })
  public readonly specialism!: string;

  public constructor(props: AuthCollectionProfessionalProfilePresenter) {
    Object.assign(this, props);
  }

  public static present(professional: Professional) {
    return new AuthCollectionProfessionalProfilePresenter({
      professionalId: professional.getId().toString(),
      specialism: professional.getSpecialism().toString(),
    });
  }
}

export class AuthCollectionPresenter {
  @ApiProperty({
    description: "Relevant data regarding the authenticated user's account.",
    type: AuthCollectionAccountPresenter,
  })
  public readonly account!: AuthCollectionAccountPresenter;

  @ApiProperty({
    description: "The list of professional profiles with which the authenticated user can act.",
    type: [AuthCollectionProfessionalProfilePresenter],
  })
  public readonly professionalProfiles!: AuthCollectionProfessionalProfilePresenter[];

  @ApiProperty({
    description: "Indicates whether this user has a patient profile associated to it.",
    type: "boolean",
  })
  public readonly isPatient!: boolean;

  public constructor(props: AuthCollectionPresenter) {
    Object.assign(this, props);
  }

  public static present(authCollection: AuthCollection) {
    return new AuthCollectionPresenter({
      account: AuthCollectionAccountPresenter.present(authCollection.account),
      professionalProfiles: authCollection.professionalProfiles.map(
        AuthCollectionProfessionalProfilePresenter.present,
      ),
      isPatient: !!authCollection.patientProfile,
    });
  }
}
