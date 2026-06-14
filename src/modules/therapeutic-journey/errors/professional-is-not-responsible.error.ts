import { ForbiddenError } from "@/common/errors/forbidden.error";

export class ProfessionalIsNotResponsible extends ForbiddenError {
  public constructor() {
    super({
      message: "O ID do profissional não condiz com o profissional responsável por este PTS.",
    });
  }
}
