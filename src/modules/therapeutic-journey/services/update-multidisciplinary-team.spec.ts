import { generateUUID } from "@/common/uuid";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { ProfessionalCannotRemoveItselfWithoutSubstitute } from "@/modules/therapeutic-journey/errors/professional-cannot-remove-itself-without-substitute.error";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalIsNotRegisteredError } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { ProfessionalIsNotResponsible } from "@/modules/therapeutic-journey/errors/professional-is-not-responsible.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { UpdateMultidisciplinaryTeamService } from "@/modules/therapeutic-journey/services/update-multidisciplinary-team.service";
import accountsFactory from "@test/factories/accounts.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { describe, expect, it, beforeEach } from "vitest";

describe("UpdateMultidisciplinaryTeamService", () => {
  let ptsRepository: InMemoryPtsRepository;
  let professionalsRepository: InMemoryProfessionalsRepository;
  let sut: UpdateMultidisciplinaryTeamService;

  beforeEach(() => {
    professionalsRepository = new InMemoryProfessionalsRepository();
    ptsRepository = new InMemoryPtsRepository(professionalsRepository);
    sut = new UpdateMultidisciplinaryTeamService(ptsRepository, professionalsRepository);
  });

  const getEntities = async () => {
    const responsibleAccount = await accountsFactory.create();
    const responsibleProfessional = await professionalsFactory.create({
      account: responsibleAccount,
    });

    const pts = await ptsFactory.create({
      responsibleProfessionalId: responsibleProfessional.getId(),
    });

    pts.updateMultidisciplinaryTeam([responsibleProfessional.getId()]);

    professionalsRepository.professionals.push(responsibleProfessional);
    ptsRepository.items.push(pts);

    return { responsibleAccount, responsibleProfessional, pts };
  };

  it("should return PtsNotFoundError when PTS wasn't found", async () => {
    const account = await accountsFactory.create();
    const professional = await professionalsFactory.create({ account });
    professionalsRepository.professionals.push(professional);

    const result = await sut.execute({
      ptsId: generateUUID(),
      multidisciplinaryTeamIds: [professional.getId()],
      professionalId: professional.getId(),
      accountId: account.getId(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(PtsNotFoundError);
  });

  it("should return ProfessionalIsNotResponsible when not the responsible is trying to update the multidisciplinary team", async () => {
    const { pts } = await getEntities();

    const maliciousAccount = await accountsFactory.create();
    const maliciousProfessional = await professionalsFactory.create({
      account: maliciousAccount,
    });
    professionalsRepository.professionals.push(maliciousProfessional);

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: [maliciousProfessional.getId()],
      professionalId: maliciousProfessional.getId(),
      accountId: maliciousAccount.getId(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(ProfessionalIsNotResponsible);
  });

  it("should return ProfessionalDoesNotBelongToUserAccountError when the requester professional does not belong to the provided account", async () => {
    const { pts, responsibleProfessional } = await getEntities();

    const anotherAccount = await accountsFactory.create();

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: [responsibleProfessional.getId()],
      professionalId: responsibleProfessional.getId(),
      accountId: anotherAccount.getId(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(ProfessionalDoesNotBelongToUserAccountError);
  });

  it("should return ProfessionalProfileNotFoundError when professional id does not identify any professional", async () => {
    const { pts } = await getEntities();

    const nonExistentProfessionalId = generateUUID();

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: [],
      professionalId: nonExistentProfessionalId,
      accountId: generateUUID(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(ProfessionalProfileNotFoundError);
  });

  it("should return ProfessionalCannotRemoveItselfWithoutSubstitute when responsible tries to remove itself and does not provide a substitute", async () => {
    const { pts, responsibleAccount, responsibleProfessional } = await getEntities();

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: [generateUUID()],
      professionalId: responsibleProfessional.getId(),
      newResponsibleId: undefined,
      accountId: responsibleAccount.getId(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(ProfessionalCannotRemoveItselfWithoutSubstitute);
  });

  it("should return ProfessionalIsNotRegistered when responsible tries to remove itself and provides invalid substitute ID", async () => {
    const { pts, responsibleAccount, responsibleProfessional } = await getEntities();

    const nonExistentSubstituteId = generateUUID();

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: [nonExistentSubstituteId],
      professionalId: responsibleProfessional.getId(),
      newResponsibleId: nonExistentSubstituteId,
      accountId: responsibleAccount.getId(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(ProfessionalIsNotRegisteredError);
  });

  it("should return IrrecoverableError when saving fails due to a missing professional in the multidisciplinary team IDs payload", async () => {
    const { pts, responsibleAccount, responsibleProfessional } = await getEntities();

    const nonExistentTeamMemberId = generateUUID();

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: [responsibleProfessional.getId(), nonExistentTeamMemberId],
      professionalId: responsibleProfessional.getId(),
      accountId: responsibleAccount.getId(),
    });

    expect(result._tag).toBe("Left");

    assert(result._tag === "Left");
    expect(result.left).toBeInstanceOf(ProfessionalIsNotRegisteredError);
  });

  it("should successfully update an pts multidisciplinary team", async () => {
    const { pts, responsibleAccount, responsibleProfessional } = await getEntities();

    const newProfessional = await professionalsFactory.create();
    professionalsRepository.professionals.push(newProfessional);

    const newTeamIds = [responsibleProfessional.getId(), newProfessional.getId()];

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: newTeamIds,
      professionalId: responsibleProfessional.getId(),
      accountId: responsibleAccount.getId(),
    });

    expect(result._tag).toBe("Right");

    const updatedPts = ptsRepository.items.find(
      (p) => p.getId().toString() === pts.getId().toString(),
    );

    const savedTeamUuids = updatedPts!.getMultidisciplinaryTeam().getCurrent();
    expect(savedTeamUuids.map(String)).toContain(newProfessional.getId());
    expect(savedTeamUuids.length).toBe(1);
  });

  it("should successfully update an pts multidisciplinary team with new responsible", async () => {
    const { pts, responsibleAccount, responsibleProfessional } = await getEntities();

    const newResponsibleProfessional = await professionalsFactory.create();
    professionalsRepository.professionals.push(newResponsibleProfessional);

    const newTeamIds = [newResponsibleProfessional.getId()];

    const result = await sut.execute({
      ptsId: pts.getId(),
      multidisciplinaryTeamIds: newTeamIds,
      professionalId: responsibleProfessional.getId(),
      newResponsibleId: newResponsibleProfessional.getId(),
      accountId: responsibleAccount.getId(),
    });

    expect(result._tag).toBe("Right");

    const updatedPts = ptsRepository.items.find(
      (p) => p.getId().toString() === pts.getId().toString(),
    );

    expect(updatedPts!.toSnapshot().responsibleProfessionalId).toBe(
      newResponsibleProfessional.getId().toString(),
    );

    const savedTeamUuids = updatedPts!.getMultidisciplinaryTeam().getCurrent();
    expect(savedTeamUuids.map(String)).toContain(responsibleProfessional.getId());
  });
});
