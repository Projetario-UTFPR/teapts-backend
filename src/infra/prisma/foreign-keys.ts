export enum PrismaSchemaForeignKey {
  // Lat updated: Migration 3 - 20260424052424_add_professionals_patient_accounts_and_basic_therapeutic_journey/migration.sql
  PatientAccountId = "patient_accountId_fkey",
  ProfessionalAccountId = "professional_accountId_fkey",
  ProfessionalMembershipOnPtsProfessionalId = "professional_participating_on_therapeutic_journey_professi_fkey",
  ProfessionalMembershipOnPtsPtsId = "professional_participating_on_therapeutic_journey_therapeu_fkey",
  PtsResponsibleProfessionalId = "projeto_terapeutico_singular_responsible_professional_id_fkey",
  PtsPatientId = "projeto_terapeutico_singular_patient_id_fkey",
  DocumentPatientAccountId = "document_patient_account_id_fkey",
  ActivityReferringToDocumentActivityId = "activity_referring_to_document_rel_activity_id_fkey",
  ActivityReferringToDocumentDocumentId = "activity_referring_to_document_rel_document_id_fkey",
  ActivityAssigneeProfessionalId = "activity_assignee_professional_id_fkey",
  ActivityPtsId = "activity_projeto_terapeutico_singular_id_fkey",
}
