import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PaginationParams } from "@/common/pagination/pagination-params";
import { Either } from "fp-ts/lib/Either";
import paginationUtils from "@/common/pagination/pagination-utils";
import { PrismaService } from "@/infra/prisma/prisma";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { UUID } from "@/common/uuid";
import { DocumentFindManyArgs, DocumentModel } from "@prisma-gen/models";
import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { DocumentPresenter } from "@/modules/patient/presenters/document.presenter";
import { PaginatedProntuarioPresenter } from "@/modules/patient/presenters/paginated-prontuario.presenter";

export type Params = PaginationParams & {
  patientId: UUID;
};

export type Result = PaginatedProntuarioPresenter;

@Injectable()
export class ListProntuarioByPatientIdQueryHandler {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly documentsStorage: DocumentFilesStorage,
  ) {}

  public execute({ limit, page, patientId }: Params): Promise<Either<IrrecoverableError, Result>> {
    const { offset, resolvedPage, resolvedLimit } = paginationUtils.resolveOffset({ page, limit });

    let where: DocumentFindManyArgs["where"] = { patientAccountId: patientId.toString() };

    return pipe(
      te.Do,
      te.apS("documents", this.fetchProfessionals({ where, limit, offset })),
      te.apS("count", this.countProfessionals({ where })),
      te.bindW("presentedDocuments", ({ documents }) => this.preparePresentedDocuments(documents)),
      te.map(({ count, presentedDocuments }) =>
        PaginatedProntuarioPresenter.present({
          items: presentedDocuments,
          count: count,
          currentPage: resolvedPage,
          resolvedLimit,
        }),
      ),
    )();
  }

  private preparePresentedDocuments(documents: DocumentModel[]) {
    return pipe(
      documents,
      te.traverseArray((document) =>
        pipe(
          () => this.documentsStorage.getSignedReadUrl({ fileKey: document.documentFileKey }),
          te.map(({ documentUrl }) => ({ ...document, documentUrl })),
        ),
      ),
      te.map((documents) => documents.map(DocumentPresenter.present)),
    );
  }

  private countProfessionals({ where }: { where: DocumentFindManyArgs["where"] }) {
    return pipe(
      te.tryCatch(
        () => this.prisma.document.count({ where }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListProntuarioByPatientIdQueryHandler.name} when counting professionals.`,
            cause: error as Error,
          }),
      ),
    );
  }

  private fetchProfessionals({
    limit,
    where,
    offset,
  }: Pick<Params, "limit"> & {
    where: DocumentFindManyArgs["where"];
    offset: number;
  }) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.document.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ListProntuarioByPatientIdQueryHandler.name} when fetching professionals.`,
            cause: error as Error,
          }),
      ),
    );
  }
}
