import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { UUID } from "@/common/uuid";
import { Document } from "../aggregates/document.aggregate";

export class DocumentNotFoundError extends ResourceNotFoundError {
  public constructor(id: UUID) {
    super({
      message: `O documento especificado não foi encontrado. ID: ${id}`,
      subject: Document.name,
    });
  }
}
