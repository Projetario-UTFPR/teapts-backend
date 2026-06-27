import { ForbiddenError } from "@/common/errors/forbidden.error";

export class NotAdminError extends ForbiddenError {
  public constructor() {
    super({ message: "Você precisa ser um administrador do sistema para prosseguir." });
  }
}
