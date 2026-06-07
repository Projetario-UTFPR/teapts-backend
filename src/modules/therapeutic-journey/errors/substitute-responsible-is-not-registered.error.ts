import { BadRequestError } from "@/common/errors/bad-request.error";

export class SubstituteResponsibleIsNotRegistered extends BadRequestError {
  public constructor() {
    super({
      message: "O ID do profissional substituto indicado não está registrado.",
    });
  }
}
