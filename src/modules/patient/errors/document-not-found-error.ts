import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { UUID } from "@/common/uuid";
import { Document } from "../aggregates/document.aggregate";

export class DocumentNotFoundError extends ResourceNotFoundError {
  public constructor(id: UUID) {
    super({
      message: `Não foi possível encontrar um documento identificado por "${id}".`,
      subject: Document.name,
    });
  }
}
