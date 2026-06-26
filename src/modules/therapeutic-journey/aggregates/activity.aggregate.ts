import { AggregateRoot } from "@/common/entities/aggregate-root";
import type { Frequency } from "@/common/time/value-objects/frequency.vo";
import { generateUUID, type UUID } from "@/common/uuid";

type ActivityProps = {
  id: UUID;
  title: string;
  frequency: Frequency;
  assigneeProfessionalId: UUID;
  documentsIds: UUID[];
  state: Activity.State;
  createdAt: Date;
  ptsId: UUID;
};

type CreateNewActivityParams = {
  title: string;
  frequency: Frequency;
  assigneeProfessionalId: UUID;
  documentsIds?: UUID[];
  ptsId: UUID;
};

export class Activity extends AggregateRoot<ActivityProps> {
  public static create({ documentsIds = [], ...props }: CreateNewActivityParams) {
    return new this({
      ...props,
      documentsIds,
      state: Activity.State.Suggested,
      id: generateUUID(),
      createdAt: new Date(),
    });
  }

  /**
   * Rehydratates an activity, i.e., creates a new `Activity` instance from a previously
   * existing activity.
   */
  public static createUnchecked(props: ActivityProps) {
    return new this(props);
  }

  public equals(other: AggregateRoot<ActivityProps>) {
    return other instanceof Activity && this._props.id === other._props.id;
  }

  public getId(): UUID {
    return this._props.id;
  }

  public getTitle(): string {
    return this._props.title;
  }

  public getAssigneProfessionalId(): UUID {
    return this._props.assigneeProfessionalId;
  }

  public getState(): Activity.State {
    return this._props.state;
  }
}

export namespace Activity {
  export enum State {
    Suggested = "suggested",
    Rejected = "rejected",
    Running = "running",
    Archived = "archived",
  }
}
