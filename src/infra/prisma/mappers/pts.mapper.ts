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

function intoPrisma(
  pts: ProjetoTerapeuticoSingular,
): Prisma.ProjetoTerapeuticoSingularCreateArgs["data"] {
  const snapshot = pts.toSnapshot();
  const multidisciplinaryTeam = snapshot.multidisciplinaryTeamIds.map((id) => ({
    professionalId: id.toString(),
  }));

  return {
    socialSituation: snapshot.socialSituation,
    status: statusIntoPrisma(snapshot.timeline.status),
    acceptedAt: snapshot.timeline.acceptedAt,
    beganAt: snapshot.timeline.beganAt,
    cancelledAt: snapshot.timeline.cancelledAt,
    concludedAt: snapshot.timeline.concludedAt,
    createdAt: snapshot.timeline.createdAt,
    rejectedAt: snapshot.timeline.rejectedAt,
    id: snapshot.id.toString(),
    patientId: snapshot.patientId.toString(),
    responsibleProfessionalId: snapshot.responsibleProfessionalId.toString(),
    multidisciplinaryTeam: { createMany: { data: multidisciplinaryTeam } },
  };
}

function fromPrisma(
  raw: Prisma.ProjetoTerapeuticoSingularModel & {
    multidisciplinaryTeam: {
      professionalId: string;
    }[];
  },
): ProjetoTerapeuticoSingular {
  return ProjetoTerapeuticoSingular.createUnchecked({
    id: raw.id,
    multidisciplinaryTeamIds: raw.multidisciplinaryTeam.map(
      (professional) => professional.professionalId,
    ),
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
