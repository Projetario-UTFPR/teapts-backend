import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";

export class PatientNotFoundError extends ResourceNotFoundError {
  public constructor() {
    super({ message: "O paciente especificado não foi encontrado.", subject: Patient.name });
  }
}
