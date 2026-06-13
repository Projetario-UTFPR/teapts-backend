import { generateUUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalDoesNotBelongToUserAccountError } from "@/modules/therapeutic-journey/errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { either as e } from "fp-ts";

describe("[Service] Verify Professional Is Authorized", async () => {
  let ptsRepository: InMemoryPtsRepository;
  let accountsRepository: InMemoryAccountsRepository;
  let sut: VerifyProfessionalIsAuthorizedService;

  beforeEach(() => {
    ptsRepository = new InMemoryPtsRepository();
    accountsRepository = new InMemoryAccountsRepository();

    sut = new VerifyProfessionalIsAuthorizedService(ptsRepository, accountsRepository);
  });

  it(
    "should verify authorization successfully when professionalId belongs " +
      "to the given accountId and it belongs to the PTS multidisciplinary team",
    async () => {
      const patient = await patientsFactory.create();
      const professionalAccount = await accountsFactory.create();
      const professional = await professionalsFactory.create({ account: professionalAccount });
      const pts = await ptsFactory.create({
        multidisciplinaryTeamIds: [professional.getId()],
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });

      accountsRepository.accounts.push(professionalAccount);
      ptsRepository.items.push(pts);

      for (const payload of [
        { accountId: professionalAccount.getId() },
        { account: professionalAccount },
      ]) {
        const result = await sut.execute({
          patientId: patient.getId(),
          professionalId: professional.getId(),
          ...payload,
        });

        expect(e.isRight(result)).toBe(true);
      }
    },
  );

  it("should fail when professionalId does not belong to the provided account", async () => {
    const patient = await patientsFactory.create();
    const differentAccount = await accountsFactory.create();
    const professionalActualAccount = await accountsFactory.create();
    const professional = await professionalsFactory.create({});
    const pts = await ptsFactory.create({
      multidisciplinaryTeamIds: [professional.getId()],
      patientId: patient.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    accountsRepository.accounts.push(differentAccount, professionalActualAccount);
    ptsRepository.items.push(pts);

    for (const payload of [
      { accountId: differentAccount.getId() },
      { account: differentAccount },
    ]) {
      const result = await sut.execute({
        patientId: patient.getId(),
        professionalId: professional.getId(),
        ...payload,
      });

      expect(e.isRight(result)).toBe(false);
      expect(result["left"]).toBeInstanceOf(ProfessionalDoesNotBelongToUserAccountError);
    }
  });

  it(
    "should perform checks against account's professional profiles " +
      "and allow when any of its profiles is member of the PTS",
    async () => {
      const patient = await patientsFactory.create();
      const veryTalentedProfessionalAccount = await accountsFactory.create();

      const professionalProfiles = [
        await professionalsFactory.create({
          account: veryTalentedProfessionalAccount,
          specialism: Professional.Specialism.Doctor,
        }),
        await professionalsFactory.create({
          account: veryTalentedProfessionalAccount,
          specialism: Professional.Specialism.Physiotherapist,
        }),
        await professionalsFactory.create({
          account: veryTalentedProfessionalAccount,
          specialism: Professional.Specialism.Psychologist,
        }),
      ];

      professionalProfiles.forEach((id) =>
        veryTalentedProfessionalAccount.pushProfessionalProfile(id),
      );

      accountsRepository.accounts.push(veryTalentedProfessionalAccount);

      for (const professional of professionalProfiles) {
        /**
         * we're creating a PTS that contains one of this talented professional's profile (one at a time),
         * and, for every profile, it should pass, since at least one profile of its has a membership
         * within the PTS
         */
        const pts = await ptsFactory.create({
          multidisciplinaryTeamIds: [professional.getId()],
          patientId: patient.getId(),
          timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        });

        ptsRepository.items.push(pts);

        const result = await sut.execute({
          patientId: patient.getId(),
          accountId: veryTalentedProfessionalAccount.getId(),
        });

        expect(e.isRight(result)).toBe(true);
      }
    },
  );

  it(
    "should succeed when any of the given account's professional " +
      "profiles is the responsible for that PTS",
    async () => {
      const patient = await patientsFactory.create();
      const veryTalentedProfessionalAccount = await accountsFactory.create();

      const professionalProfiles = [
        await professionalsFactory.create({
          account: veryTalentedProfessionalAccount,
          specialism: Professional.Specialism.Doctor,
        }),
        await professionalsFactory.create({
          account: veryTalentedProfessionalAccount,
          specialism: Professional.Specialism.Physiotherapist,
        }),
        await professionalsFactory.create({
          account: veryTalentedProfessionalAccount,
          specialism: Professional.Specialism.Psychologist,
        }),
      ];

      professionalProfiles.forEach((id) =>
        veryTalentedProfessionalAccount.pushProfessionalProfile(id),
      );

      accountsRepository.accounts.push(veryTalentedProfessionalAccount);

      for (const professional of professionalProfiles) {
        /**
         * Ensure, for each profile, that if it is the responsible for that PTS,
         * then the given account must be authorized
         */
        const pts = await ptsFactory.create({
          multidisciplinaryTeamIds: [],
          patientId: patient.getId(),
          responsibleProfessionalId: professional.getId(),
          timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        });

        ptsRepository.items.push(pts);

        // not specifying any professional ID
        const result = await sut.execute({
          patientId: patient.getId(),
          accountId: veryTalentedProfessionalAccount.getId(),
        });

        expect(e.isRight(result)).toBe(true);
      }
    },
  );

  it("should succeed when given professional is the responsible for that PTS", async () => {
    const patient = await patientsFactory.create();
    const professional = await professionalsFactory.create();
    const pts = await ptsFactory.create({
      multidisciplinaryTeamIds: [],
      patientId: patient.getId(),
      responsibleProfessionalId: professional.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    ptsRepository.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
    });

    expect(e.isRight(result)).toBe(true);
  });

  it(
    "should fail when professional does not belong to the PTS" +
      "multidisciplinary team nor it is the responsible for that PTS",
    async () => {
      const patient = await patientsFactory.create();
      const professional = await professionalsFactory.create();
      const pts = await ptsFactory.create({
        multidisciplinaryTeamIds: [],
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });

      ptsRepository.items.push(pts);

      const result = await sut.execute({
        patientId: patient.getId(),
        professionalId: professional.getId(),
      });

      expect(e.isRight(result)).toBe(false);
      expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
    },
  );

  it(
    "should fail when given professionalId does not belong to the provided accountId " +
      "even if another profile from that account is member of the PTS",
    async () => {
      const patient = await patientsFactory.create();
      const differentAccount = await accountsFactory.create();
      const professionalActualAccount = await accountsFactory.create();

      const professionalProfile1 = await professionalsFactory.create({
        account: professionalActualAccount,
        specialism: Professional.Specialism.Doctor,
      });
      const professionalProfile2 = await professionalsFactory.create({
        account: professionalActualAccount,
        specialism: Professional.Specialism.Physiotherapist,
      });
      const professionalProfile3 = await professionalsFactory.create({
        account: professionalActualAccount,
        specialism: Professional.Specialism.Psychologist,
      });
      // notice that this below belongs to `differentAccount`!
      const professionalProfile4 = await professionalsFactory.create({
        account: differentAccount,
        specialism: Professional.Specialism.Psychologist,
      });

      const pts = await ptsFactory.create({
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        multidisciplinaryTeamIds: [
          professionalProfile1.getId(),
          professionalProfile2.getId(),
          professionalProfile3.getId(),
          professionalProfile4.getId(),
        ],
      });

      accountsRepository.accounts.push(differentAccount, professionalActualAccount);
      ptsRepository.items.push(pts);

      for (const payload of [
        { accountId: differentAccount.getId() },
        { account: differentAccount },
      ]) {
        const result = await sut.execute({
          patientId: patient.getId(),
          professionalId: professionalProfile1.getId(),
          ...payload,
        });

        expect(e.isRight(result)).toBe(false);
        expect(result["left"]).toBeInstanceOf(ProfessionalDoesNotBelongToUserAccountError);
      }
    },
  );

  it("should always unauthorize when no accountId nor professionalId is given", async () => {
    const patient = await patientsFactory.create();
    const pts = await ptsFactory.create({
      multidisciplinaryTeamIds: [],
      patientId: patient.getId(),
    });

    ptsRepository.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
    });

    expect(e.isRight(result)).toBe(false);
    expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
  });

  it("should fail when account could not be found", async () => {
    const patient = await patientsFactory.create();
    const professionalAccount = await accountsFactory.create();
    const professional = await professionalsFactory.create({ account: professionalAccount });
    const pts = await ptsFactory.create({
      multidisciplinaryTeamIds: [professional.getId()],
      patientId: patient.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    // notice that we're not persisting the professional's account in the repository,
    // thus it ain't being found at all...
    ptsRepository.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
      accountId: professionalAccount.getId(),
    });

    expect(e.isRight(result)).toBe(false);
    expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
  });

  it(
    "should succeed when given `professionalId`-identified profile is " +
      "not member of that PTS but other profile from given account is",
    async () => {},
  );

  it("should trust that the professional exists if its ID is within the PTS already", async () => {
    const patient = await patientsFactory.create();
    const professional = await professionalsFactory.create();
    const pts = await ptsFactory.create({
      multidisciplinaryTeamIds: [professional.getId()],
      patientId: patient.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    // notice that we're not persisting the professional's account in the repository...
    // it ain't checking whether it exists or not at all, it's just gonna blindly trust it
    ptsRepository.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
    });

    expect(e.isRight(result)).toBe(true);
  });

  it("should fail as unauthorized when the PTS does not exist or is no longer active", async () => {
    const patient = await patientsFactory.create();

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: generateUUID(), // any professional ID, since it should fail before even checking it
    });

    expect(e.isRight(result)).toBe(false);
    expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
  });

  it("should use given account instead of searching with repository when both account and accountId are provided", async () => {
    const patient = await patientsFactory.create();
    const account = await accountsFactory.create();
    const professional = await professionalsFactory.create({ account });
    const pts = await ptsFactory.create({
      multidisciplinaryTeamIds: [professional.getId()],
      patientId: patient.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    // notice that we're not persisting the professional's account in the repository...
    // it ain't checking whether it exists or not at all, it's just gonna blindly trust it
    ptsRepository.items.push(pts);
    accountsRepository.accounts.push(account);

    const accountsRepoSpy = vi.spyOn(accountsRepository, "findAccountById");

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
      account,
      accountId: account.getId(),
    });

    expect(e.isRight(result)).toBe(true);
    expect(accountsRepoSpy).not.toHaveBeenCalled();
  });
});
