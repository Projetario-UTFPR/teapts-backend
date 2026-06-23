import { PaginationResult } from "@/common/pagination/pagination-result";
import { ApiProperty } from "@nestjs/swagger";

type PresenterClass<T> = Function & { prototype: T };

export interface IPaginatedDataPresenter<T = unknown> {
  page: number;
  perPage: number;
  totalElements: number;
  items: T[];
}

/**
 * This is not an actual class, but a generator. Use it to instantiate paginated presenters
 * for your already-existing presenters.
 *
 * @example
 * export class PaginatedProfessionalsWithAccountsPresenter extends PaginatedDataPresenter(
 *   ProfessionalWithAccountPresenter,
 * ) {}
 */
export function PaginatedDataPresenter<T extends object>(presenter: PresenterClass<T>) {
  class BasePaginatedDataPresenter implements IPaginatedDataPresenter<T> {
    @ApiProperty({ description: "The current page of the pagination.", type: "number" })
    public readonly page!: number;

    @ApiProperty({
      description: "The actual quantity of items being displayed per page.",
      type: "number",
    })
    public readonly perPage!: number;

    @ApiProperty({
      description: "The total amount of elements satisfying the query.",
      type: "number",
    })
    public readonly totalElements!: number;

    @ApiProperty({ description: "The queried elements.", type: [presenter] })
    public readonly items!: T[];

    protected constructor(props: BasePaginatedDataPresenter) {
      Object.assign(this, props);
    }

    public static present(data: PaginationResult & { items: T[] }) {
      return new this({
        items: data.items,
        page: data.currentPage,
        perPage: data.resolvedLimit,
        totalElements: data.count,
      });
    }
  }

  Object.defineProperty(BasePaginatedDataPresenter, "name", {
    value: `Paginated${presenter.name}Presenter`,
  });

  return BasePaginatedDataPresenter;
}
