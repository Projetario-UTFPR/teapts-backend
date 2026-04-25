import { Professional } from "@/modules/professional/entities/professional.entity";
import { $Enums, Prisma } from "@prisma-gen/browser";

function specialismFromPrisma(specialism: $Enums.Specialism) {
  switch (specialism) {
    case $Enums.Specialism.Psychologist:
      return Professional.Specialism.Psychologist;
    case $Enums.Specialism.Doctor:
      return Professional.Specialism.Doctor;
    case $Enums.Specialism.Physiotherapist:
      return Professional.Specialism.Physiotherapist;
  }
}

function fromPrisma(raw: Prisma.ProfessionalModel) {
  return Professional.createUnchecked({
    id: raw.id,
    accountId: raw.accountId,
    specialism: specialismFromPrisma(raw.specialism),
  });
}

export default { fromPrisma };
