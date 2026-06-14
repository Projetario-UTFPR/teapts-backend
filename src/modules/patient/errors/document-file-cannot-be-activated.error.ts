import { BadRequestError } from "@/common/errors/bad-request.error";

/**
 * Indicates that a professional tried to activate a document's file, but
 * the document hasn't been stored yet.
 */
export class DocumentFileCannotBeActivatedError extends BadRequestError {
  public constructor(fileKey: string) {
    super({
      message:
        `O documento identificado por "${fileKey}" não existe no armazenmento de documentos, ` +
        "e portanto não pode ser ativada.",
    });
  }
}
