import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";

export class PtsNotFoundError extends ResourceNotFoundError {
  public constructor() {
    super({ message: "Não foi encontrado nenhum PTS para esse paciente.", subject: Patient.name });
  }
}
