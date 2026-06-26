import { generateUUID, UUID } from "@/common/uuid";
import timelineRecordMapper from "@/infra/prisma/mappers/timeline-record.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { faker } from "@faker-js/faker";

type CreateParams = {
  id: UUID;
  target: TimelineRecord.TargetType;
  type: TimelineRecord.Type;
  targetId: UUID;
  description: string;
  happenedAt: Date;
  ptsId: UUID;
  responsibleProfessionalId?: UUID;
};

async function create({
  id = generateUUID(),
  target = TimelineRecord.TargetType.Activity,
  type = TimelineRecord.Type.Created,
  targetId = generateUUID(),
  description = faker.lorem.words(3),
  happenedAt = new Date(),
  ptsId = generateUUID(),
  responsibleProfessionalId = generateUUID(),
}: Partial<CreateParams> = {}) {
  return TimelineRecord.createUnchecked({
    id,
    target,
    type,
    targetId,
    description,
    happenedAt,
    ptsId,
    responsibleProfessionalId,
  });
}

type CreateAndPersistParams = Partial<CreateParams>;

async function createAndPersist(prismaService: PrismaService, params: CreateAndPersistParams) {
  const timelineRecord = await create(params);

  const data = timelineRecordMapper.intoPrisma(timelineRecord);

  await prismaService.timelineRecord.create({ data });

  return timelineRecord;
}

export default { create, createAndPersist };
