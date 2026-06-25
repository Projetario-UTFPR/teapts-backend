import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { DocumentPresenter } from "@/modules/patient/presenters/document.presenter";

export class PaginatedProntuarioPresenter extends PaginatedDataPresenter(DocumentPresenter) {}
