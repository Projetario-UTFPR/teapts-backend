import { generateUUID } from "@/common/uuid";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { faker } from "@faker-js/faker";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import { either, taskEither } from "fp-ts";
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

  return pipe(
    patientId
      ? either.right(patientId)
      : pipe(
          await patientsFactory.create(),
          either.map((patient) => patient.getId()),
        ),
    either.map((patientId) =>
      ProjetoTerapeuticoSingular.createUnchecked({
        patientId,
        responsibleProfessionalId,
        socialSituation,
        id,
        multidisciplinaryTeamIds,
        timeline,
      }),
    ),
  );
}

async function createAndPersist(prismaService: PrismaService, params?: CreateParams) {
  return await pipe(
    () => create(params),
    taskEither.map(ptsMapper.intoPrisma),
    taskEither.chain((data) =>
      taskEither.fromTask(() =>
        prismaService.projetoTerapeuticoSingular.create({
          data,
          include: {
            multidisciplinaryTeam: { select: { professionalId: true } },
          },
        }),
      ),
    ),
    taskEither.map((row) => {
      const { multidisciplinaryTeam, ...rawPts } = row;

      const multidisciplinaryTeamIds = multidisciplinaryTeam.map(
        ({ professionalId }) => professionalId,
      );

      ptsMapper.fromPrisma({ ...rawPts, multidisciplinaryTeamIds });
    }),
  )();
}

export default { create, createAndPersist };
