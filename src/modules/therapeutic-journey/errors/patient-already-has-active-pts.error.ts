import { ConflictError } from "@/common/errors/conflict.error";

export class PatientAlreadyHasActivePtsError extends ConflictError {
  public constructor() {
    super({ message: "Já existe uma jornada terapêutica ativa para este paciente." });
  }
}
