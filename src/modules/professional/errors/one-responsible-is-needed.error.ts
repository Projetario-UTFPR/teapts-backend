import { BadRequestError } from "@/common/errors/bad-request.error";

export class OneResponsibleIsNeeded extends BadRequestError {
  public constructor() {
    super({
      message: `É obrigatório ao menos um profissional responsável.`,
    });
  }
}
