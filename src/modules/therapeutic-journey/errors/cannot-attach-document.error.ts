import { BadRequestError } from "@/common/errors/bad-request.error";

export class CannotAttachDocumentError extends BadRequestError {
  public constructor() {
    super({
      message: `Não foi possível associar documentos a atividade, já que ao menos um deles não pertence ao paciente`,
    });
  }
}
