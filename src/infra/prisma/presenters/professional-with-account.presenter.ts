import professionalsMapper from "@/infra/prisma/mappers/professionals.mapper";
import { ProfessionalWithAccountPresenter } from "@/modules/professional/presenters/professional-with-account.presenter";
import { Prisma } from "@prisma-gen/client";

export class PrismaProfessionalWithAccountPresenter extends ProfessionalWithAccountPresenter {
  public static present(row: Prisma.ProfessionalModel & { account: Prisma.AccountModel }) {
    return new PrismaProfessionalWithAccountPresenter({
      professionalId: row.id,
      accountId: row.account.id,
      name: row.account.name,
      email: row.account.email,
      specialism: professionalsMapper.specialismFromPrisma(row.specialism),
      lastUpdatedAt: row.account.lastUpdatedAt ?? undefined,
      createdAt: row.account.createdAt,
    }) as ProfessionalWithAccountPresenter;
  }
}
