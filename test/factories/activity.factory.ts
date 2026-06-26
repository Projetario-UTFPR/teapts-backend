import {
  Frequency,
  TimeDuration,
  TimeInterval,
  TimeUnit,
} from "@/common/time/value-objects/frequency.vo";
import { generateUUID } from "@/common/uuid";
import activityMapper from "@/infra/prisma/mappers/activity.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Activity } from "@/modules/therapeutic-journey/aggregates/activity.aggregate";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { faker } from "@faker-js/faker";
import ptsFactory from "@test/factories/pts.factory";

type OriginalCreateParams = Parameters<(typeof Activity)["createUnchecked"]>[0];
type CreateParams = Omit<OriginalCreateParams, "ptsId"> & { pts: ProjetoTerapeuticoSingular };

export function generateRandomFrequency(): Frequency {
  const timeUnits = Object.values(TimeUnit);

  const times = faker.number.int({ min: 1, max: 5 });

  const isIntervalTuple = faker.datatype.boolean();
  const intervalUnit = faker.helpers.arrayElement(timeUnits);
  const interval: TimeInterval = isIntervalTuple
    ? [faker.number.int({ min: 2, max: 5 }), intervalUnit]
    : intervalUnit;

  const hasDuration = faker.datatype.boolean();
  const duration: TimeDuration | undefined = hasDuration
    ? [faker.number.int({ min: 1, max: 12 }), faker.helpers.arrayElement(timeUnits)]
    : undefined;

  return Frequency.createUnchecked({
    times,
    interval,
    duration,
  });
}

async function create({
  id = generateUUID(),
  title = faker.lorem.words(3),
  assigneeProfessionalId = generateUUID(),
  frequency = generateRandomFrequency(),
  documentsIds = [],
  state = Activity.State.Suggested,
  createdAt = new Date(),
  pts,
}: Partial<CreateParams> = {}) {
  pts ??= await ptsFactory.create();

  return Activity.createUnchecked({
    id,
    title,
    assigneeProfessionalId,
    frequency,
    documentsIds,
    state,
    createdAt,
    ptsId: pts.getId(),
  });
}
type CreateAndPersistParams = Partial<CreateParams>;
async function createAndPersist(prisma: PrismaService, params: CreateAndPersistParams) {
  params.pts ??= await ptsFactory.createAndPersist(prisma);
  const activity = await create(params);

  const data = activityMapper.intoPrisma(activity);

  await prisma.activity.create({ data });

  return activity;
}

export default { create, createAndPersist, generateRandomFrequency };
