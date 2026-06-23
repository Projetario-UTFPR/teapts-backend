import { AggregateRoot } from "@/common/entities/aggregate-root";
import { generateUUID, type UUID } from "@/common/uuid";

type DocumentProps = {
  id: UUID;
  patientId: UUID;
  title: string;
  description?: string;
  documentFileKey: string;
  createdAt: Date;
  lastUpdatedAt?: Date;
};

type CreateNewDocumentParams = {
  title: string;
  description?: string;
  documentFileKey: string;
  patientId: UUID;
};

/**
 * A document from the patient of id `patientId`. Multiples `Document`s composes the patient's
 * _Prontuário_ (medical record).
 */
export class Document extends AggregateRoot<DocumentProps> {
  public static create(props: CreateNewDocumentParams) {
    return new this({
      ...props,
      id: generateUUID(),
      createdAt: new Date(),
      lastUpdatedAt: undefined,
    });
  }

  public static createUnchecked(props: DocumentProps) {
    return new this(props);
  }

  public equals(other: Document): boolean {
    return other instanceof this.constructor && this._props.id === other._props.id;
  }

  public getId(): UUID {
    return this._props.id;
  }

  public getPatientId(): UUID {
    return this._props.patientId;
  }

  public getTitle(): string {
    return this._props.title;
  }

  public getDocumentFileKey(): string {
    return this._props.documentFileKey;
  }

  public getDescription(): string {
    return this._props.description!;
  }

  public getCreatedAt(): Date {
    return this._props.createdAt;
  }

  public getLastUpdatedAt(): Date | undefined {
    return this._props.lastUpdatedAt;
  }

  public belongsToPatient(patientId: UUID) {
    return patientId === this._props.patientId;
  }

  private touch() {
    this._props.lastUpdatedAt = new Date();
  }
}
