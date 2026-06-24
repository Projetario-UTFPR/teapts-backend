import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { ShallowActivityPresenter } from "./shallow-activity.presenter";

@ApiSchema({
    description: "A paginated response containing a list of shallow activities.",
})
export class PaginatedActivitiesPresenter {
    @ApiProperty({
        description: "The list of activities in the current page.",
        type: [ShallowActivityPresenter],
    })
    public readonly items!: ShallowActivityPresenter[];

    @ApiProperty({
        description: "The total number of activities listed.",
        example: 24,
    })
    public readonly count!: number;

    @ApiProperty({
        description: "The current page number being returned.",
        example: 1,
    })
    public readonly currentPage!: number;

    @ApiProperty({
        description: "The maximum number of items returned in this page.",
        example: 10,
    })
    public readonly resolvedLimit!: number;

    protected constructor(props: PaginatedActivitiesPresenter) {
        Object.assign(this, props);
    }

    public static present(data: {
        items: ShallowActivityPresenter[];
        count: number;
        currentPage: number;
        resolvedLimit: number;
    }): PaginatedActivitiesPresenter {
        return new PaginatedActivitiesPresenter({
            items: data.items,
            count: data.count,
            currentPage: data.currentPage,
            resolvedLimit: data.resolvedLimit,
        });
    }
}