import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { generateUUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalCannotRemoveItselfWithoutSubstitute } from "@/modules/therapeutic-journey/errors/professional-cannot-remove-itself-without-substitute.error";
import { ProfessionalIsNotResponsible } from "@/modules/therapeutic-journey/errors/professional-is-not-responsible.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { SubstituteResponsibleIsNotRegistered } from "@/modules/therapeutic-journey/errors/substitute-responsible-is-not-registered.error";
import { UpdateMultidisciplinaryTeamService } from "@/modules/therapeutic-journey/services/update-multidisciplinary-team.service";
import { left, right } from "fp-ts/lib/Either";

describe("UpdateMultidisciplinaryTeamService", () => {
  let mockPtsRepository: any;
  let mockProfessionalsRepository: any;
  let sut: UpdateMultidisciplinaryTeamService;

  beforeEach(() => {
    mockPtsRepository = {
      getById: vi.fn(),
      save: vi.fn(),
    };
    mockProfessionalsRepository = {
      findById: vi.fn(),
    };
    sut = new UpdateMultidisciplinaryTeamService(mockPtsRepository, mockProfessionalsRepository);
  });

  it("should return PTSNotFound when PTS wasn't found", async () => {
    mockPtsRepository.getById.mockResolvedValue(null);

    const ptsId = generateUUID();
    const professionalId = generateUUID();
    const multidisciplinaryTeamIds = [generateUUID()];
    const accountId = generateUUID();

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      accountId,
    });

    expect(result._tag).toBe("Left");

    const error = (result as any).left;
    expect(error).toBeInstanceOf(PtsNotFoundError);

    expect(mockPtsRepository.save).not.toHaveBeenCalled();
  });

  it("should return ProfessionalIsNotResponsible when not the responsible is trying to update the multidisciplinary team", async () => {
    const accountId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: generateUUID(),
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    const professionalFake = Professional.create({
      accountId,
      specialism: Professional.Specialism.Doctor,
    });

    mockPtsRepository.getById.mockResolvedValue(ptsFake);

    mockProfessionalsRepository.findById.mockResolvedValue(right(professionalFake));

    const ptsId = ptsFake.getId();
    const professionalId = generateUUID();
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID()];

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      accountId,
    });

    expect(result._tag).toBe("Left");

    const error = (result as any).left;
    expect(error).toBeInstanceOf(ProfessionalIsNotResponsible);

    expect(mockPtsRepository.save).not.toHaveBeenCalled();
  });

  it("should return ProfessionalProfileNotFoundError when professional id does not identify any professional", async () => {
    const responsibleId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: responsibleId,
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    mockPtsRepository.getById.mockResolvedValue(ptsFake);

    mockProfessionalsRepository.findById.mockResolvedValue(
      left(new ProfessionalProfileNotFoundError(responsibleId)),
    );

    const ptsId = ptsFake.getId();
    const professionalId = responsibleId;
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID()];
    const accountId = generateUUID();

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      accountId,
    });

    expect(result._tag).toBe("Left");

    const error = (result as any).left;
    expect(error).toBeInstanceOf(ProfessionalProfileNotFoundError);

    expect(mockPtsRepository.save).not.toHaveBeenCalled();
  });

  it("should return ProfessionalCannotRemoveItselfWithoutSubstitute when responsible tries to remove itself and does not provide a substitute", async () => {
    const accountId = generateUUID();
    const responsibleId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: responsibleId,
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    const professionalFake = Professional.create({
      accountId,
      specialism: Professional.Specialism.Doctor,
    });

    mockProfessionalsRepository.findById.mockResolvedValue(right(professionalFake));

    mockPtsRepository.getById.mockResolvedValue(ptsFake);

    const ptsId = ptsFake.getId();
    const professionalId = responsibleId;
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID()];
    const newResponsibleId = undefined;

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      newResponsibleId,
      accountId,
    });

    expect(result._tag).toBe("Left");

    const error = (result as any).left;
    expect(error).toBeInstanceOf(ProfessionalCannotRemoveItselfWithoutSubstitute);
  });

  it("should return SubstituteResponsibleIsNotRegistered when responsible tries to remove itself and provides invalid substitute ID", async () => {
    const accountId = generateUUID();
    const responsibleId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: responsibleId,
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    const professionalFake = Professional.create({
      accountId,
      specialism: Professional.Specialism.Doctor,
    });

    mockPtsRepository.getById.mockResolvedValue(ptsFake);

    const ptsId = ptsFake.getId();
    const professionalId = responsibleId;
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID()];
    const newResponsibleId = generateUUID();

    mockProfessionalsRepository.findById.mockImplementation(async (id: string) => {
      if (id === responsibleId) {
        return right(professionalFake);
      }
      if (id === newResponsibleId) {
        return left(SubstituteResponsibleIsNotRegistered);
      }
    });

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      newResponsibleId,
      accountId,
    });

    expect(result._tag).toBe("Left");

    const error = (result as any).left;
    expect(error).toBeInstanceOf(SubstituteResponsibleIsNotRegistered);
  });

  it("should return IrrecoverableError when transaction fails", async () => {
    const accountId = generateUUID();
    const responsibleId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: responsibleId,
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    const professionalFake = Professional.create({
      accountId,
      specialism: Professional.Specialism.Doctor,
    });

    mockProfessionalsRepository.findById.mockResolvedValue(right(professionalFake));

    mockPtsRepository.getById.mockResolvedValue(ptsFake);
    mockPtsRepository.save.mockResolvedValue(left(IrrecoverableError));

    const updateSpy = vi.spyOn(ptsFake, "updateMultidisciplinaryTeam");
    const isResponsabilitySpy = vi.spyOn(ptsFake, "isResponsabilityOfProfessional");

    const ptsId = ptsFake.getId();
    const professionalId = responsibleId;
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID(), responsibleId];

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      accountId,
    });

    expect(result._tag).toBe("Left");

    const error = (result as any).left;
    expect(error).toBe(IrrecoverableError);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(multidisciplinaryTeamIds);

    expect(isResponsabilitySpy).toHaveBeenCalledTimes(1);
    expect(isResponsabilitySpy).toHaveBeenCalledWith(professionalId);

    expect(mockPtsRepository.save).toHaveBeenCalledWith(ptsFake);
  });

  it("should update an pts multidisciplinary team", async () => {
    const accountId = generateUUID();
    const responsibleId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: responsibleId,
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    const professionalFake = Professional.create({
      accountId,
      specialism: Professional.Specialism.Doctor,
    });

    mockProfessionalsRepository.findById.mockResolvedValue(right(professionalFake));

    mockPtsRepository.getById.mockResolvedValue(ptsFake);
    mockPtsRepository.save.mockResolvedValue(right(true));

    const updateSpy = vi.spyOn(ptsFake, "updateMultidisciplinaryTeam");
    const isResponsabilitySpy = vi.spyOn(ptsFake, "isResponsabilityOfProfessional");

    const ptsId = ptsFake.getId();
    const professionalId = responsibleId;
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID(), responsibleId];

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      accountId,
    });

    expect(result._tag).toBe("Right");

    const error = (result as any).right;
    expect(error).toBe(true);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(multidisciplinaryTeamIds);

    expect(isResponsabilitySpy).toHaveBeenCalledTimes(1);
    expect(isResponsabilitySpy).toHaveBeenCalledWith(professionalId);

    expect(mockPtsRepository.save).toHaveBeenCalledWith(ptsFake);
  });

  it("should update an pts multidisciplinary team with new responsible", async () => {
    const accountId = generateUUID();
    const responsibleId = generateUUID();

    const ptsFake = ProjetoTerapeuticoSingular.create({
      patientId: generateUUID(),
      responsibleProfessionalId: responsibleId,
      socialSituation: "Cenário de teste",
      multidisciplinaryTeamIds: [generateUUID()],
    });

    const professionalFake = Professional.create({
      accountId,
      specialism: Professional.Specialism.Doctor,
    });

    mockProfessionalsRepository.findById.mockResolvedValue(right(professionalFake));

    mockPtsRepository.getById.mockResolvedValue(ptsFake);
    mockPtsRepository.save.mockResolvedValue(right(true));

    const updateSpy = vi.spyOn(ptsFake, "updateMultidisciplinaryTeam");
    const isResponsabilitySpy = vi.spyOn(ptsFake, "isResponsabilityOfProfessional");
    const changeResponsibleSpy = vi.spyOn(ptsFake, "changeResponsibleProfessional");

    const ptsId = ptsFake.getId();
    const professionalId = responsibleId;
    const newResponsibleId = generateUUID();
    const multidisciplinaryTeamIds = [generateUUID(), generateUUID()];

    const result = await sut.execute({
      ptsId,
      multidisciplinaryTeamIds,
      professionalId,
      newResponsibleId,
      accountId,
    });

    expect(result._tag).toBe("Right");

    const error = (result as any).right;
    expect(error).toBe(true);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(multidisciplinaryTeamIds);

    expect(isResponsabilitySpy).toHaveBeenCalledTimes(1);
    expect(isResponsabilitySpy).toHaveBeenCalledWith(professionalId);

    expect(changeResponsibleSpy).toHaveBeenCalledTimes(1);
    expect(changeResponsibleSpy).toHaveBeenCalledWith(newResponsibleId);

    expect(mockProfessionalsRepository.findById).toHaveBeenCalledTimes(2);
    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(professionalId);
    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(newResponsibleId);

    expect(mockPtsRepository.save).toHaveBeenCalledWith(ptsFake);
  });
});
