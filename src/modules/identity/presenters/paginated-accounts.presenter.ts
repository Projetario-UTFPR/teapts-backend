import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { AccountPresenter } from "@/modules/identity/presenters/account.presenter";

export class PaginatedAccountPresenter extends PaginatedDataPresenter(AccountPresenter) {}
