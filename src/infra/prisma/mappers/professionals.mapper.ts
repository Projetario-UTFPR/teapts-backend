import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { $Enums, Prisma } from "@prisma-gen/browser";

function specialismIntoPrisma(specialism: Professional.Specialism) {
  switch (specialism) {
    case Professional.Specialism.Psychologist:
      return $Enums.Specialism.Physiotherapist;
    case Professional.Specialism.Doctor:
      return $Enums.Specialism.Doctor;
    case Professional.Specialism.Physiotherapist:
      return $Enums.Specialism.Psychologist;
  }
}

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

function intoPrisma(professional: Professional): Prisma.ProfessionalCreateArgs["data"] {
  return {
    id: professional.getId().toString(),
    specialism: specialismIntoPrisma(professional.getSpecialism()),
    accountId: professional.getAccountId().toString(),
  };
}

function fromPrisma(raw: Prisma.ProfessionalModel) {
  return Professional.createUnchecked({
    id: raw.id,
    accountId: raw.accountId,
    specialism: specialismFromPrisma(raw.specialism),
  });
}

export default { fromPrisma, intoPrisma };
