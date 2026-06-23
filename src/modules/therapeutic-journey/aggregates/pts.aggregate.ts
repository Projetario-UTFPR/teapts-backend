import { AggregateRoot } from "@/common/entities/aggregate-root";
import { generateUUID, type UUID } from "@/common/uuid";
import { WatchedList } from "@/common/entities/watched-list";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type PtsProps = {
  id: UUID;
  /**
   * The identifier of the patient whom this PTS belongs to.
   */
  patientId: UUID;
  /**
   * The identifier of the professional (profile) leading this PTS.
   */
  responsibleProfessionalId: UUID;
  /**
   * The identifiers of every professional (profile) involved with this PTS.
   */
  multidisciplinaryTeam: WatchedList<UUID>;
  /**
   * A text containing info about the patient (identified by `patientId`) regarding their social
   * situation. E.g., who they live with, whether they have support network (and who they are),
   * social vulnerability they're under, their desires and goals, _et cetera_.
   */
  socialSituation: string;
  timeline: PtsTimeline;
  activitiesIds: UUID[];
};

type CreateNewPtsParams = {
  patientId: UUID;
  responsibleProfessionalId: UUID;
  socialSituation: string;
  multidisciplinaryTeamIds?: UUID[];
};

export class ProjetoTerapeuticoSingular extends AggregateRoot<PtsProps> {
  public static create({
    patientId,
    socialSituation,
    responsibleProfessionalId,
    multidisciplinaryTeamIds = [],
  }: CreateNewPtsParams) {
    // We gotta ensure responsible professional ain't being put in the multidisciplinary team,
    // we can infer it belongs to the team because it is the responsible professional... No need
    // to keep it redundant.
    multidisciplinaryTeamIds = multidisciplinaryTeamIds.filter(
      (professionalId) => professionalId !== responsibleProfessionalId,
    );

    const multidisciplinaryTeam = new WatchedList<UUID>(multidisciplinaryTeamIds);

    return new this({
      id: generateUUID(),
      patientId,
      socialSituation,
      responsibleProfessionalId,
      timeline: PtsTimeline.create(),
      multidisciplinaryTeam,
      activitiesIds: [],
    });
  }

  /**
   * Rehydrates a PTS instance, i.e., creates a PTS from an existing PTS.
   *
   * @note This method does not perform any check nor provide any default value. Only use
   * it to get a PTS instance for some already existing PTS.
   */
  public static createUnchecked(props: PtsProps) {
    return new this(props);
  }

  // TODO: add watched list methods to add and remove unique elements
  public changeResponsibleProfessional(newResponsibleId: UUID, multidisciplinaryTeamIds: UUID[]) {
    multidisciplinaryTeamIds.push(this._props.responsibleProfessionalId);
    this._props.responsibleProfessionalId = newResponsibleId;
    // remove responsible professional id from multidisciplinary team by smth like watchedlist.remove(<id>)
  }

  public updateMultidisciplinaryTeam(newMultidisciplinaryTeamIds: UUID[]) {
    newMultidisciplinaryTeamIds = newMultidisciplinaryTeamIds.filter(
      (professionalId) => professionalId !== this._props.responsibleProfessionalId,
    );

    this._props.multidisciplinaryTeam.update(newMultidisciplinaryTeamIds);
  }

  public getMultidisciplinaryTeam(): WatchedList<UUID> {
    return this._props.multidisciplinaryTeam;
  }

  public getId() {
    return this._props.id;
  }

  public getSocialSituation() {
    return this._props.socialSituation;
  }

  public getTimeline(): PtsTimeline {
    return this._props.timeline;
  }

  public acceptAndBeginPlanning() {
    return pipe(
      this._props.timeline.acceptAndBeginPlanning(),
      either.map((newTimeline) => {
        this._props.timeline = newTimeline;
      }),
    );
  }

  /**
   * Checks whether `professional` is the responsible professional of this PTS.
   */
  public isResponsabilityOfProfessional(professional: Professional | UUID) {
    const professionalId =
      professional instanceof Professional ? professional.getId() : professional;

    return this._props.responsibleProfessionalId === professionalId;
  }

  public belongsToPatient(patient: Patient | UUID) {
    const patientId = patient instanceof Patient ? patient.getId() : patient;
    return this._props.patientId === patientId;
  }

  public canBeModifiedByProfessional(professional: Professional | UUID) {
    const professionalId =
      professional instanceof Professional ? professional.getId() : professional;

    return (
      this._props.responsibleProfessionalId === professionalId ||
      this._props.multidisciplinaryTeam.getCurrent().includes(professionalId)
    );
  }

  /**
   * Adds `professional` to this PTS' multidisciplinary team.
   *
   * @note It performs nothing if `professional` is already member of the PTS
   * (i.e. responsible or regular member of the multidisciplinary team).
   */
  public addProfessionalToMultidisciplinaryTeam(professional: Professional | UUID) {
    const professionalId =
      professional instanceof Professional ? professional.getId() : professional;

    if (
      this._props.responsibleProfessionalId === professionalId ||
      this._props.multidisciplinaryTeam.getCurrent().includes(professionalId)
    ) {
      return;
    }

    this._props.multidisciplinaryTeam.getCurrent().push(professionalId);
  }

  public isDraft() {
    return this._props.timeline.status === PtsTimeline.Status.Draft;
  }

  public isRejected() {
    return this._props.timeline.status === PtsTimeline.Status.Rejected;
  }

  public isPlanning() {
    return this._props.timeline.status === PtsTimeline.Status.Planning;
  }

  public isRunning() {
    return this._props.timeline.status === PtsTimeline.Status.Running;
  }

  public isCancelled() {
    return this._props.timeline.status === PtsTimeline.Status.Cancelled;
  }

  public isConcluded() {
    return this._props.timeline.status === PtsTimeline.Status.Concluded;
  }

  /**
   * A PTS is considered active when it's either under planning or is running already.
   */
  public isActive() {
    const activeStatuses = [PtsTimeline.Status.Planning, PtsTimeline.Status.Running];
    return activeStatuses.includes(this._props.timeline.status);
  }

  public isTerminated() {
    const currentState = this._props.timeline.status;
    const terminalStates = [
      PtsTimeline.Status.Cancelled,
      PtsTimeline.Status.Rejected,
      PtsTimeline.Status.Concluded,
    ];

    return terminalStates.includes(currentState);
  }

  public equals(other: AggregateRoot<PtsProps>) {
    return other instanceof ProjetoTerapeuticoSingular && this._props.id === other._props.id;
  }
}

export namespace ProjetoTerapeuticoSingular {
  export type Props = PtsProps;
}
