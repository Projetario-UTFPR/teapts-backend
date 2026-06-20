import {
  Frequency,
  TimeDuration,
  TimeInterval,
  TimeUnit,
} from "@/common/time/value-objects/frequency.vo";
import { generateUUID, UUID } from "@/common/uuid";
import { Activity } from "@/modules/therapeutic-journey/aggregates/activity.aggregate";
import { faker } from "@faker-js/faker";

type CreateParams = {
  id: UUID;
  title: string;
  assigneeProfessionalId: UUID;
  frequency: Frequency;
  documentsIds: UUID[];
  state: Activity.State;
  createdAt: Date;
};

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
}: Partial<CreateParams> = {}) {
  return Activity.createUnchecked({
    id,
    title,
    assigneeProfessionalId,
    frequency,
    documentsIds,
    state,
    createdAt,
  });
}

export default { create, generateRandomFrequency };
