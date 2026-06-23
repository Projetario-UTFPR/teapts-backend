import { BadRequestError } from "@/common/errors/bad-request.error";

export class CannotAttachDocumentError extends BadRequestError {
  public constructor() {
    super({
      message: `Não foi possível criar a atividade, pois há documentos inexistentes ou não relacionados ao paciente.`,
    });
  }
}
