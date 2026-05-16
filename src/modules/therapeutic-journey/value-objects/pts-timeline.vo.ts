import { StatusIntegrityViolationError } from "@/modules/therapeutic-journey/errors/status-integrity-violation.error";
import { either as e } from "fp-ts";

interface IPtsTimeline {
  readonly status: PtsTimeline.Status;
  readonly createdAt: Date;
  /**
   * The date-time when the patient (identified by `patientId`) accepted this PTS.
   */
  readonly acceptedAt?: Date;
  /**
   * The date-time when the patient (identified by `patientId`) denied this PTS.
   */
  readonly rejectedAt?: Date;
  /**
   * The date-time when the planning ended and the PTS took action.
   */
  readonly beganAt?: Date;
  /**
   * The date-time when the PTS has been finished (the patient's been discharged).
   */
  readonly concludedAt?: Date;
  /**
   * The date-time when the PTS has been cancelled. E.g., the patient changed to a brand new PTS.
   */
  readonly cancelledAt?: Date;
}

export class PtsTimeline implements IPtsTimeline {
  public readonly status: PtsTimeline.Status;
  public readonly createdAt: Date;
  public readonly acceptedAt?: Date;
  public readonly rejectedAt?: Date;
  public readonly beganAt?: Date;
  public readonly concludedAt?: Date;
  public readonly cancelledAt?: Date;

  private constructor(props: IPtsTimeline) {
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.acceptedAt = props.acceptedAt;
    this.rejectedAt = props.rejectedAt;
    this.beganAt = props.beganAt;
    this.concludedAt = props.concludedAt;
    this.cancelledAt = props.cancelledAt;
  }

  public static create() {
    return new PtsTimeline({
      status: PtsTimeline.Status.Draft,
      createdAt: new Date(),
    });
  }

  public static createUnchecked(props: IPtsTimeline) {
    return new PtsTimeline(props);
  }

  public acceptAndBeginPlanning() {
    if (this.status === PtsTimeline.Status.Planning) return e.right(this);

    if (this.status !== PtsTimeline.Status.Draft) {
      const message = "Você não pode iniciar o planejamento um PTS que não é mais um rascunho.";
      return e.left(new StatusIntegrityViolationError({ message }));
    }

    const newStatus = new PtsTimeline({
      status: PtsTimeline.Status.Planning,
      createdAt: this.createdAt,
      acceptedAt: new Date(),
    });

    return e.right(newStatus);
  }

  public reject() {
    if (this.status === PtsTimeline.Status.Rejected) return e.right(this);

    if (this.status !== PtsTimeline.Status.Draft) {
      const message = "Você só pode rejeitar a proposta de um PTS quando ele ainda é um rascunho.";
      return e.left(new StatusIntegrityViolationError({ message }));
    }

    const newStatus = new PtsTimeline({
      ...this,
      status: PtsTimeline.Status.Rejected,
      rejectedAt: new Date(),
    });

    return e.right(newStatus);
  }

  public begin() {
    if (this.status === PtsTimeline.Status.Running) return e.right(this);

    if (this.status !== PtsTimeline.Status.Planning) {
      const message =
        "O PTS precisa estar atualmente em fase de planejamento " +
        "para que possa ser, enfim, iniciado.";

      return e.left(new StatusIntegrityViolationError({ message }));
    }

    const newStatus = new PtsTimeline({
      ...this,
      status: PtsTimeline.Status.Running,
      beganAt: new Date(),
    });

    return e.right(newStatus);
  }

  public conclude() {
    if (this.status === PtsTimeline.Status.Concluded) return e.right(this);

    if (this.status === PtsTimeline.Status.Cancelled) {
      const message = "Você não pode concluir um PTS que foi cancelado.";
      return e.left(new StatusIntegrityViolationError({ message }));
    }

    if (this.status === PtsTimeline.Status.Rejected) {
      const message = "Você não pode concluir um PTS que foi rejeitado.";
      return e.left(new StatusIntegrityViolationError({ message }));
    }

    if (this.status !== PtsTimeline.Status.Running) {
      const message = "Você só pode concluir um PTS que esteja em andamento (até então).";
      return e.left(new StatusIntegrityViolationError({ message }));
    }

    const newStatus = new PtsTimeline({
      ...this,
      status: PtsTimeline.Status.Concluded,
      concludedAt: new Date(),
    });

    return e.right(newStatus);
  }

  public cancel() {
    if (this.status === PtsTimeline.Status.Cancelled) return e.right(this);

    if ([PtsTimeline.Status.Concluded, PtsTimeline.Status.Rejected].includes(this.status)) {
      const message = "Você não pode cancelar um PTS que não está mais em andamento.";
      return e.left(new StatusIntegrityViolationError({ message }));
    }

    const newStatus = new PtsTimeline({
      ...this,
      status: PtsTimeline.Status.Cancelled,
      cancelledAt: new Date(),
    });

    return e.right(newStatus);
  }
}

export namespace PtsTimeline {
  // We keep this encapsulated in such manner in order to avoid ourselves
  // using this status directly, bypassing the timeline's rules.
  // It can still be accessed, but will require so many dots that will be
  // discouraging!

  export enum Status {
    Draft = "draft",
    Planning = "planning",
    Running = "running",
    Concluded = "concluded",
    Cancelled = "cancelled",
    Rejected = "rejected",
  }
}
