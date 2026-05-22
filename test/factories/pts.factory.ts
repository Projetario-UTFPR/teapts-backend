import { generateUUID } from "@/common/uuid";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { faker } from "@faker-js/faker";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import { resolvePatient, resolveProfessional } from "@test/factories/utils";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type CreateTimeLineParams = Partial<Parameters<typeof PtsTimeline.createUnchecked>[0]>;

function createTimeline({
  createdAt = new Date(),
  status = PtsTimeline.Status.Draft,
  ...props
}: CreateTimeLineParams = {}) {
  return PtsTimeline.createUnchecked({ ...props, createdAt, status });
}

type CreateParams = Partial<ProjetoTerapeuticoSingular.Props>;

async function create({
  id = generateUUID(),
  multidisciplinaryTeamIds = [],
  patientId,
  responsibleProfessionalId,
  socialSituation = faker.lorem.paragraphs({ min: 1, max: 5 }),
  timeline = createTimeline(),
}: CreateParams = {}) {
  responsibleProfessionalId ??= (await professionalsFactory.create()).getId();
  patientId ??= (await patientsFactory.create()).getId();

  return ProjetoTerapeuticoSingular.createUnchecked({
    patientId,
    responsibleProfessionalId,
    socialSituation,
    id,
    multidisciplinaryTeamIds,
    timeline,
  });
}

async function createAndPersist(prismaService: PrismaService, params?: CreateParams) {
  const patient = await resolvePatient(prismaService, params?.patientId);

  const responsibleProfessional = await resolveProfessional(
    prismaService,
    params?.responsibleProfessionalId,
  );

  const pts = await create({
    ...params,
    responsibleProfessionalId: responsibleProfessional.getId(),
    patientId: patient.getId(),
  });

  return await pipe(
    taskEither.tryCatch(
      () =>
        prismaService.projetoTerapeuticoSingular.create({
          data: ptsMapper.intoPrisma(pts),
          include: { multidisciplinaryTeam: { select: { professionalId: true } } },
        }),
      (error) => error,
    ),
    taskEither.map((row) => ptsMapper.fromPrisma(row)),
    taskEither.getOrElse((error) => {
      throw error;
    }),
  )();
}

export default { create, createAndPersist, createTimeline };
