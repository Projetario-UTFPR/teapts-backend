import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { SupportContact } from "@/modules/patient/value-objects/support-contact.vo";
import { Prisma } from "@prisma-gen/client";

type RawPatient = Prisma.PatientModel;

function intoPrisma(patient: Patient): Prisma.PatientCreateArgs["data"] {
  return {
    accountId: patient.getId().toString(),
    supportContacts: patient.getSupportContacts().map((supportContact) => ({
      name: supportContact.name,
      description: supportContact.description,
      phone: supportContact.phone,
      email: supportContact.email,
    })),
  };
}

function supportContactsFromPrisma(raw: Prisma.JsonValue) {
  const requiredFields = ["name", "description", "phone"];

  const isObject = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const isValid = isObject && requiredFields.every((field) => field in raw);

  if (!isValid) {
    // TODO: add logging to inform that there is inconsistent support contact (that might be removed due to
    // being ignored by this function
    return undefined;
  }

  const { name, description, phone, email } = raw as unknown as SupportContact;
  return new SupportContact(name, description, phone, email);
}

function fromPrisma(raw: RawPatient) {
  const nonUndefined = <T>(value: T | undefined): value is T => value !== undefined;
  return Patient.createUnchecked({
    accountId: raw.accountId,
    supportContacts: raw.supportContacts.map(supportContactsFromPrisma).filter(nonUndefined),
  });
}

export default { intoPrisma, fromPrisma };
