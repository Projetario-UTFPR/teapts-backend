import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";
import { VerifyAccountIsAuthorizedAsPatientOrProfessionalService } from "@/modules/therapeutic-journey/services/verify-account-is-authorized-as-patient-or-professional.service";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { either as e } from "fp-ts";

describe("[Service] Verify Account Is Authorized As Patient Or Professional", async () => {
  let ptsRepo: InMemoryPtsRepository;
  let accountsRepo: InMemoryAccountsRepository;
  let verifyProfessionalIsAuthorized: VerifyProfessionalIsAuthorizedService;
  let sut: VerifyAccountIsAuthorizedAsPatientOrProfessionalService;

  beforeEach(() => {
    ptsRepo = new InMemoryPtsRepository();
    accountsRepo = new InMemoryAccountsRepository();
    verifyProfessionalIsAuthorized = new VerifyProfessionalIsAuthorizedService(
      ptsRepo,
      accountsRepo,
    );
    sut = new VerifyAccountIsAuthorizedAsPatientOrProfessionalService(
      verifyProfessionalIsAuthorized,
    );
  });

  const getEntities = async () => {
    const patientAccount = await accountsFactory.create();
    const patient = await patientsFactory.create({ accountId: patientAccount.getId() });

    accountsRepo.accounts.push(patientAccount);

    return { patient, patientAccount };
  };

  it("should return 'patient' when accountPatientProfile matches the given patientId", async () => {
    const { patient, patientAccount } = await getEntities();

    const result = await sut.execute({
      patientId: patient.getId(),
      account: patientAccount,
      accountPatientProfile: patient,
    });

    expect(e.isRight(result)).toBe(true);
    expect(result["right"]).toBe("patient");
  });

  it("should not call verifyProfessionalIsAuthorized when patient check passes", async () => {
    const { patient, patientAccount } = await getEntities();

    const spy = vi.spyOn(verifyProfessionalIsAuthorized, "execute");

    const result = await sut.execute({
      patientId: patient.getId(),
      account: patientAccount,
      accountPatientProfile: patient,
    });

    expect(spy).not.toHaveBeenCalled();
    expect(e.isRight(result)).toBe(true);
  });

  it("should return 'professional' and delegate to verifyProfessionalIsAuthorized when account is not the patient", async () => {
    const { patient } = await getEntities();
    const professionalAccount = await accountsFactory.create();
    const professional = await professionalsFactory.create({ account: professionalAccount });
    const pts = await ptsFactory.create({
      patientId: patient.getId(),
      multidisciplinaryTeamIds: [professional.getId()],
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    accountsRepo.accounts.push(professionalAccount);
    ptsRepo.items.push(pts);

    const spy = vi.spyOn(verifyProfessionalIsAuthorized, "execute");

    const result = await sut.execute({
      patientId: patient.getId(),
      account: professionalAccount,
    });

    expect(e.isRight(result)).toBe(true);
    expect(result["right"]).toBe("professional");
    expect(spy).toHaveBeenCalledWith({ patientId: patient.getId(), account: professionalAccount });
  });

  it("should fail when account is neither the patient nor an authorized professional", async () => {
    const { patient } = await getEntities();
    const unauthorizedAccount = await accountsFactory.create();
    const pts = await ptsFactory.create({
      patientId: patient.getId(),
      multidisciplinaryTeamIds: [],
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    accountsRepo.accounts.push(unauthorizedAccount);
    ptsRepo.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
      account: unauthorizedAccount,
    });

    expect(e.isRight(result)).toBe(false);
    expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
  });

  it("should fall through to professional check when accountPatientProfile belongs to a different patient rather than short-circuiting", async () => {
    const { patient } = await getEntities();
    const anotherPatientAccount = await accountsFactory.create();
    const anotherPatient = await patientsFactory.create({
      accountId: anotherPatientAccount.getId(),
    });
    const professional = await professionalsFactory.create({ account: anotherPatientAccount });
    const pts = await ptsFactory.create({
      patientId: patient.getId(),
      multidisciplinaryTeamIds: [professional.getId()],
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    accountsRepo.accounts.push(anotherPatientAccount);
    ptsRepo.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
      account: anotherPatientAccount,
      accountPatientProfile: anotherPatient, // profile doesn't match patientId
    });

    expect(e.isRight(result)).toBe(true);
    expect(result["right"]).toBe("professional");
  });
});
