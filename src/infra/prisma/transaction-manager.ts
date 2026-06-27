import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma";
import { Prisma } from "@prisma-gen/browser";
import { TransactionManager } from "@/common/transaction-manager";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { BaseError } from "@/common/errors/base.error";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";

type Transaction = Prisma.TransactionClient;

@Injectable()
export class PrismaTransactionManager extends TransactionManager<Transaction> {
  private readonly storage = new AsyncLocalStorage<Transaction>();

  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public executePipeline<E extends BaseError, R>(work: TaskEither<E, R>) {
    return pipe(
      te.tryCatch(
        () =>
          this.runInTransaction(
            pipe(
              work,
              te.getOrElse((error) => this.rollback(error)),
            ),
          ),
        (error) => {
          if (error instanceof BaseError) return error as E;

          return new IrrecoverableError({
            message:
              `Uncaught error occurred in ${PrismaTransactionManager.name} when running ` +
              "a pipeline in a transaction.",
            cause: error as Error,
          });
        },
      ),
    );
  }

  public async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return this.storage.run(tx, work);
    });
  }

  public getTx(): Transaction | undefined {
    return this.storage.getStore();
  }

  public rollback<Error extends BaseError>(error: Error): never {
    throw error;
  }
}
