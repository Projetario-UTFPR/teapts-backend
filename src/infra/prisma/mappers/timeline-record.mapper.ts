import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { $Enums, Prisma } from "@prisma-gen/client";

type RawTimelineRecord = Prisma.TimelineRecordModel;

function targetTypeFromPrisma(type: $Enums.TimelineRecordTarget): TimelineRecord.TargetType {
  switch (type) {
    case $Enums.TimelineRecordTarget.Activity:
      return TimelineRecord.TargetType.Activity;
    case $Enums.TimelineRecordTarget.Pts:
      return TimelineRecord.TargetType.Pts;
  }
}

function targetTypeIntoPrisma(type: TimelineRecord.TargetType): $Enums.TimelineRecordTarget {
  switch (type) {
    case TimelineRecord.TargetType.Activity:
      return "Activity";
    case TimelineRecord.TargetType.Pts:
      return "Pts";
  }
}

function recordTypeFromPrisma(type: $Enums.TimelineRecordType): TimelineRecord.Type {
  switch (type) {
    case $Enums.TimelineRecordType.Created:
      return TimelineRecord.Type.Created;
    case $Enums.TimelineRecordType.Approved:
      return TimelineRecord.Type.Approved;
    case $Enums.TimelineRecordType.Edited:
      return TimelineRecord.Type.Edited;
    case $Enums.TimelineRecordType.Removed:
      return TimelineRecord.Type.Removed;
    case $Enums.TimelineRecordType.Other:
      return TimelineRecord.Type.Other;
  }
}

function recordTypeIntoPrisma(type: TimelineRecord.Type): $Enums.TimelineRecordType {
  switch (type) {
    case TimelineRecord.Type.Created:
      return "Created";
    case TimelineRecord.Type.Approved:
      return "Approved";
    case TimelineRecord.Type.Edited:
      return "Edited";
    case TimelineRecord.Type.Removed:
      return "Removed";
    case TimelineRecord.Type.Other:
      return "Other";
  }
}

function intoPrisma(timeline: TimelineRecord): Prisma.TimelineRecordCreateArgs["data"] {
  const snapshot = timeline.toSnapshot();

  let targetType = targetTypeIntoPrisma(snapshot.target);
  let recordType = recordTypeIntoPrisma(snapshot.type);

  return {
    id: snapshot.id.toString(),
    targetType,
    type: recordType,
    happenedAt: snapshot.happenedAt,
    description: snapshot.description,
    targetId: snapshot.targetId.toString(),
    projetoTerapeuticoSingularId: snapshot.ptsId.toString(),
    authorProfessionalId: snapshot.responsibleProfessionalId?.toString(),
  };
}

function fromPrisma(row: RawTimelineRecord) {
  return TimelineRecord.createUnchecked({
    description: row.description,
    happenedAt: row.happenedAt,
    id: row.id,
    ptsId: row.projetoTerapeuticoSingularId,
    targetId: row.targetId,
    responsibleProfessionalId: row.authorProfessionalId ?? undefined,
    target: targetTypeFromPrisma(row.targetType),
    type: recordTypeFromPrisma(row.type),
  });
}

export default {
  intoPrisma,
  fromPrisma,
  recordTypeIntoPrisma,
  targetTypeIntoPrisma,
  recordTypeFromPrisma,
  targetTypeFromPrisma,
};
