import { AggregateRoot } from "@/common/entities/aggregate-root";
import { generateUUID, type UUID } from "@/common/uuid";

interface ITimelineRecord {
  /**
   * The identifier of this record within the system.
   */
  id: UUID;
  /**
   * The type of target which this record is about. E.g.: "pts"
   * when it's a change regarding something within the PTS itself — like being approved.
   *
   * @example "pts"
   */
  target: TimelineRecord.TargetType;
  /**
   * The nature of the event being registred.
   */
  type: TimelineRecord.Type;
  /**
   * The identifier of the target within the platform. Can be used with
   * `target` to find the actual target entity if needed.
   */
  targetId: UUID;
  /**
   * A rich text — yet brief — that describes what happened.
   */
  description: string;
  /**
   * The date and time when the action happened — and thus this record has been created.
   */
  happenedAt: Date;
  /**
   * The ID of the Projeto Terapêutico Singular (PTS) to which this record is related.
   */
  ptsId: UUID;
  /**
   * The ID of the professional who triggered this record. Only present when the
   * record describes an event that was actually triggered by a professional, i.g.,
   * suggesting a new activity.
   */
  responsibleProfessionalId?: UUID;
}

type CreateNewTimelineRecordParams = Omit<ITimelineRecord, "id" | "happenedAt">;

export class TimelineRecord extends AggregateRoot<ITimelineRecord> {
  public static create({
    type,
    ptsId,
    target,
    targetId,
    description,
    responsibleProfessionalId,
  }: CreateNewTimelineRecordParams) {
    return new TimelineRecord({
      id: generateUUID(),
      happenedAt: new Date(),
      type,
      ptsId,
      target,
      targetId,
      description,
      responsibleProfessionalId,
    });
  }

  public static createUnchecked(props: ITimelineRecord) {
    return new TimelineRecord(props);
  }

  public equals(other: AggregateRoot<ITimelineRecord>) {
    return other instanceof TimelineRecord && this._props.id === other._props.id;
  }
}

export namespace TimelineRecord {
  /**
   * The target of the event that has been triggered.
   */
  export enum TargetType {
    Pts = "pts",
    Activity = "activity",
  }

  /**
   * Describes generic actions that might help describing the event recorded.
   */
  export enum Type {
    Created = "created",
    Approved = "approved",
    Edited = "edited",
    Removed = "removed",
    Other = "other",
  }
}
