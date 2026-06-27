import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { PatientWithAccountPresenter } from "@/modules/patient/presenters/prisma-patient-with-account.presenter";

export class PaginatedPatientsPresenter extends PaginatedDataPresenter(
  PatientWithAccountPresenter,
) {}
