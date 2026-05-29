import { UpdateMultidisciplinaryTeamService } from "@/modules/therapeutic-journey/services/update-multidisciplinary-team.service";
import { ProfessionalIsNotResponsible } from "@/modules/professional/errors/professional-is-not-responsible.error";
import accountsFactory from "@test/factories/accounts.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { assert, describe, expect, it, beforeEach } from "vitest";

describe("[Use Case] Update Multidisciplinary Team", async () => {
  let ptsRepository: InMemoryPtsRepository;
  let professionalsRepository: InMemoryProfessionalsRepository;
  let sut: UpdateMultidisciplinaryTeamService;

  beforeEach(() => {
    professionalsRepository = new InMemoryProfessionalsRepository();
    ptsRepository = new InMemoryPtsRepository(professionalsRepository);
    sut = new UpdateMultidisciplinaryTeamService(ptsRepository);
  });

  const getEntities = async () => {
    const responsibleAccount = await accountsFactory.create();
    const responsibleProfessional = await professionalsFactory.create({
      accountId: responsibleAccount.getId(),
    });

    const pts = await ptsFactory.create({
      responsibleProfessionalId: responsibleProfessional.getId(),
    });

    professionalsRepository.professionals.push(responsibleProfessional);
    ptsRepository.items.push(pts);

    return { responsibleAccount, responsibleProfessional, pts };
  };

  it("should successfully update the multidisciplinary team when requested by the responsible professional", async () => {
    const { responsibleProfessional, pts } = await getEntities();

    const newProfessionals = await Promise.all(
      Array.from({ length: 3 }).map(() => professionalsFactory.create()),
    );
    professionalsRepository.professionals.push(...newProfessionals);

    const multidisciplinaryTeamIds = [
      responsibleProfessional.getId(),
      ...newProfessionals.map((p) => p.getId()),
    ];

    await sut.execute({
      ptsId: pts.getId(),
      professionalId: responsibleProfessional.getId(),
      multidisciplinaryTeamIds,
    });

    const savedRelations = ptsRepository.professionalParticipatingOnPTS.filter(
      (relation) => relation.projetoTerapeuticoSingularId === pts.getId().toString(),
    );

    expect(savedRelations.length).toBe(4);
    const savedIds = savedRelations.map((r) => r.professionalId);
    expect(savedIds).toEqual(expect.arrayContaining(multidisciplinaryTeamIds.map(String)));
  });

  it("should block the action and throw an error if the professional trying to execute the update is not the current responsible for the PTS", async () => {
    const { pts } = await getEntities();

    const maliciousProfessional = await professionalsFactory.create();
    professionalsRepository.professionals.push(maliciousProfessional);

    const promise = sut.execute({
      ptsId: pts.getId(),
      professionalId: maliciousProfessional.getId(),
      multidisciplinaryTeamIds: [],
    });

    await expect(promise).rejects.toBeInstanceOf(ProfessionalIsNotResponsible);
  });

  it("should successfully set a new responsible for the PTS when newResponsibleId is explicitly provided", async () => {
    const { responsibleProfessional, pts } = await getEntities();

    const newResponsibleProfessional = await professionalsFactory.create();
    professionalsRepository.professionals.push(newResponsibleProfessional);

    // 👇 Ajustado para passar ptsId
    await sut.execute({
      ptsId: pts.getId(),
      professionalId: responsibleProfessional.getId(),
      multidisciplinaryTeamIds: [responsibleProfessional.getId()],
      newResponsibleId: newResponsibleProfessional.getId(),
    });

    const updatedPts = ptsRepository.items.find(
      (item) => item.getId().toString() === pts.getId().toString(),
    );

    assert(updatedPts, "PTS should exist in repository");
    expect(updatedPts.toSnapshot().responsibleProfessionalId).toBe(
      newResponsibleProfessional.getId(),
    );
  });

  it("should throw an error and protect database integrity if any of the provided multidisciplinary team ids do not exist", async () => {
    const { responsibleProfessional, pts } = await getEntities();

    const nonExistentProfessional = await professionalsFactory.create();
    const multidisciplinaryTeamIds = [nonExistentProfessional.getId()];

    const promise = sut.execute({
      ptsId: pts.getId(),
      professionalId: responsibleProfessional.getId(),
      multidisciplinaryTeamIds,
    });

    await expect(promise).rejects.toThrowError();
  });

  it("should throw a specific business exception if the current responsible removes himself from the team without passing a new replacement responsible", async () => {
    const { responsibleProfessional, pts } = await getEntities();

    const anotherProfessional = await professionalsFactory.create();
    professionalsRepository.professionals.push(anotherProfessional);

    const multidisciplinaryTeamIds = [anotherProfessional.getId()];

    const promise = sut.execute({
      ptsId: pts.getId(),
      professionalId: responsibleProfessional.getId(),
      multidisciplinaryTeamIds,
      newResponsibleId: undefined,
    });

    await expect(promise).rejects.toThrowError();
  });
});
