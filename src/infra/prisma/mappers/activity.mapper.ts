import { Frequency, TimeDuration, TimeInterval } from "@/common/time/value-objects/frequency.vo";
import { Activity } from "@/modules/therapeutic-journey/aggregates/activity.aggregate";
import { $Enums, Prisma } from "@prisma-gen/client";

function stateIntoPrisma(state: Activity.State): $Enums.ActivityState {
  switch (state) {
    case Activity.State.Archived:
      return $Enums.ActivityState.Archived;
    case Activity.State.Rejected:
      return $Enums.ActivityState.Rejected;
    case Activity.State.Running:
      return $Enums.ActivityState.Running;
    case Activity.State.Suggested:
      return $Enums.ActivityState.Suggested;
  }
}

function stateFromPrisma(state: $Enums.ActivityState): Activity.State {
  switch (state) {
    case $Enums.ActivityState.Archived:
      return Activity.State.Archived;
    case $Enums.ActivityState.Rejected:
      return Activity.State.Rejected;
    case $Enums.ActivityState.Running:
      return Activity.State.Running;
    case $Enums.ActivityState.Suggested:
      return Activity.State.Suggested;
  }
}

function intoPrisma(activity: Activity): Prisma.ActivityCreateArgs["data"] {
  const snapshot = activity.toSnapshot();

  return {
    id: snapshot.id.toString(),
    assigneeProfessionalId: snapshot.assigneeProfessionalId.toString(),
    createdAt: snapshot.createdAt,
    title: snapshot.title,
    frequency: {
      interval: snapshot.frequency.interval,
      times: snapshot.frequency.times,
      duration: snapshot.frequency.duration,
    },
    state: stateIntoPrisma(snapshot.state),
    projetoTerapeuticoSingularId: snapshot.ptsId.toString(),
  };
}

function fromPrisma(raw: Prisma.ActivityModel & { documents: { id: string }[] }) {
  const documentsIds = raw.documents.map((document) => document.id);

  const rawFrequency = raw.frequency as unknown as {
    interval: TimeInterval;
    times: number;
    duration: TimeDuration;
  };

  const frequency = Frequency.createUnchecked({
    interval: rawFrequency.interval,
    times: rawFrequency.times,
    duration: rawFrequency.duration,
  });

  return Activity.createUnchecked({
    id: raw.id,
    ptsId: raw.projetoTerapeuticoSingularId,
    assigneeProfessionalId: raw.assigneeProfessionalId,
    title: raw.title,
    frequency,
    documentsIds,
    state: stateFromPrisma(raw.state),
    createdAt: raw.createdAt,
  });
}

export default { intoPrisma, fromPrisma };
