import { UUID } from "@/common/uuid";
import { WatchedList } from "@/core/watched-list";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { $Enums, Prisma } from "@prisma-gen/browser";

function statusIntoPrisma(PtsStatus: PtsTimeline.Status) {
  switch (PtsStatus) {
    case PtsTimeline.Status.Cancelled:
      return $Enums.PtsStatus.Cancelled;
    case PtsTimeline.Status.Concluded:
      return $Enums.PtsStatus.Concluded;
    case PtsTimeline.Status.Draft:
      return $Enums.PtsStatus.Draft;
    case PtsTimeline.Status.Planning:
      return $Enums.PtsStatus.Planning;
    case PtsTimeline.Status.Rejected:
      return $Enums.PtsStatus.Rejected;
    case PtsTimeline.Status.Running:
      return $Enums.PtsStatus.Running;
  }
}

function statusFromPrisma(PtsStatus: $Enums.PtsStatus) {
  switch (PtsStatus) {
    case $Enums.PtsStatus.Cancelled:
      return PtsTimeline.Status.Cancelled;
    case $Enums.PtsStatus.Concluded:
      return PtsTimeline.Status.Concluded;
    case $Enums.PtsStatus.Draft:
      return PtsTimeline.Status.Draft;
    case $Enums.PtsStatus.Planning:
      return PtsTimeline.Status.Planning;
    case $Enums.PtsStatus.Rejected:
      return PtsTimeline.Status.Rejected;
    case $Enums.PtsStatus.Running:
      return PtsTimeline.Status.Running;
  }
}

function intoPrisma(pts: ProjetoTerapeuticoSingular, operation: "create" | "update" = "create") {
  const snapshot = pts.toSnapshot();
  const multidisciplinaryTeam = pts.getMultidisciplinaryTeam();

  const data: any = {
    socialSituation: snapshot.socialSituation,
    status: statusIntoPrisma(snapshot.timeline.status),
    acceptedAt: snapshot.timeline.acceptedAt,
    beganAt: snapshot.timeline.beganAt,
    cancelledAt: snapshot.timeline.cancelledAt,
    concludedAt: snapshot.timeline.concludedAt,
    createdAt: snapshot.timeline.createdAt,
    rejectedAt: snapshot.timeline.rejectedAt,
    patientId: snapshot.patientId.toString(),
    responsibleProfessionalId: snapshot.responsibleProfessionalId.toString(),
  };

  if (operation === "create") {
    data.id = snapshot.id.toString();

    const currentIds = multidisciplinaryTeam.getCurrent().map((id) => ({
      professionalId: id.toString(),
    }));
    console.log(currentIds);
    data.multidisciplinaryTeam = { createMany: { data: currentIds } };
  }

  if (operation === "update") {
    const removedIds = multidisciplinaryTeam.getRemoved().map((id) => id.toString());
    const insertedIds = multidisciplinaryTeam.getInserted().map((id) => id.toString());
    console.log(multidisciplinaryTeam.getCurrent());

    data.multidisciplinaryTeam = {
      ...(removedIds.length > 0 && {
        deleteMany: {
          professionalId: { in: removedIds },
        },
      }),
      ...(insertedIds.length > 0 && {
        createMany: {
          data: insertedIds.map((id) => ({ professionalId: id })),
        },
      }),
    };
  }

  return data;
}

function fromPrisma(
  raw: Prisma.ProjetoTerapeuticoSingularModel & {
    multidisciplinaryTeam: {
      professionalId: string;
    }[];
  },
): ProjetoTerapeuticoSingular {
  const teamIds = raw.multidisciplinaryTeam.map((member) => member.professionalId as UUID);

  const multidisciplinaryTeam = new WatchedList<UUID>(teamIds);

  return ProjetoTerapeuticoSingular.createUnchecked({
    id: raw.id,
    multidisciplinaryTeam,
    patientId: raw.patientId,
    responsibleProfessionalId: raw.responsibleProfessionalId,
    socialSituation: raw.socialSituation,
    timeline: PtsTimeline.createUnchecked({
      createdAt: raw.createdAt,
      status: statusFromPrisma(raw.status),
      acceptedAt: raw.acceptedAt ?? undefined,
      beganAt: raw.beganAt ?? undefined,
      cancelledAt: raw.cancelledAt ?? undefined,
      concludedAt: raw.concludedAt ?? undefined,
      rejectedAt: raw.rejectedAt ?? undefined,
    }),
  });
}

export default { fromPrisma, intoPrisma };
