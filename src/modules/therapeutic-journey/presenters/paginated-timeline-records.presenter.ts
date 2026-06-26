import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { TimelineRecordPresenter } from "./timeline-record.presenter";

export class PaginatedTimelinePresenter extends PaginatedDataPresenter(
  TimelineRecordPresenter,
) { }
