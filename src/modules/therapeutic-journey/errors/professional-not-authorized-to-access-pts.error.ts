import { ForbiddenError } from "@/common/errors/forbidden.error";

export class ProfessionalNotAuthorizedToAccessPts extends ForbiddenError {
  public constructor() {
    super({
      message: `Profissional não autorizado a acessar o projeto terapêutico singular.`,
    });
  }
}
