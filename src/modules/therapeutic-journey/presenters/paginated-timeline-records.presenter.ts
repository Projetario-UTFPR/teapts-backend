import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { TimelineRecordPresenter } from "./timeline-record.presenter";

@ApiSchema({
  description: "A paginated response containing a list of timeline records.",
})
export class PaginatedTimelinePresenter {
  @ApiProperty({
    description: "The total number of timeline records that match the applied filters.",
    example: 24,
  })
  public readonly count!: number;

  @ApiProperty({
    description: "The current page of the pagination being returned.",
    example: 1,
  })
  public readonly currentPage!: number;

  @ApiProperty({
    description: "The maximum amount of items returned in this page.",
    example: 10,
  })
  public readonly resolvedLimit!: number;

  @ApiProperty({
    description: "The timeline records for the current page.",
    type: [TimelineRecordPresenter],
  })
  public readonly items!: TimelineRecordPresenter[];

  protected constructor(props: PaginatedTimelinePresenter) {
    Object.assign(this, props);
  }

  public static present(props: {
    count: number;
    currentPage: number;
    resolvedLimit: number;
    items: TimelineRecordPresenter[];
  }) {
    return new PaginatedTimelinePresenter({
      count: props.count,
      currentPage: props.currentPage,
      resolvedLimit: props.resolvedLimit,
      items: props.items,
    });
  }
}
