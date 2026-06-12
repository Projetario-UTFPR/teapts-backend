import { BadRequestError } from "@/common/errors/bad-request.error";

export class ProfessionalIsNotRegisteredError extends BadRequestError {
  public constructor(public readonly level: "responsible" | "team") {
    super({
      message:
        level === "responsible"
          ? "Este profissional não está apropriadamente registrado na plataforma."
          : "Ao menos um dos profissionais da equipe não está registrado na plataforma apropriadamente.",
    });
  }
}
