import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { ShallowActivityPresenter } from "./shallow-activity.presenter";

export class PaginatedActivitiesPresenter extends PaginatedDataPresenter(
  ShallowActivityPresenter,
) { }
