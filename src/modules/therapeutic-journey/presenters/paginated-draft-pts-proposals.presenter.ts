import { PaginatedDataPresenter } from "@/common/pagination/paginated-data.presenter";
import { DraftPtsProposalPresenter } from "@/modules/therapeutic-journey/presenters/draft-pts-proposal.presenter";

export class PaginatedDraftPtsProposalsPresenter extends PaginatedDataPresenter(
  DraftPtsProposalPresenter,
) {}
