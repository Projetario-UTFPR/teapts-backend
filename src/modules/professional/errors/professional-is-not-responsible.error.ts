import { UnauthorizedError } from "@/common/errors/unauthorized.error";

export class ProfessionalIsNotResponsible extends UnauthorizedError {
  public constructor() {
    super({
      message: `Profissionail não autorizado por não ser o responsável pelo PTS.`,
    });
  }
}
