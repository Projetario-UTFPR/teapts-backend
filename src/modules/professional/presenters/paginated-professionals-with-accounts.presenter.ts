import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { ProfessionalWithAccountPresenter } from "@/modules/professional/presenters/professional-with-account.presenter";

export class PaginatedProfessionalsWithAccountsPresenter extends PaginatedDataPresenter(
  ProfessionalWithAccountPresenter,
) {}
