import { BaseError } from "@/common/errors/base.error";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { TransactionManager } from "@/common/transaction-manager";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";

/**
 * Absolutely useless transaction manager... There is no easy way of
 * ensuring atomical behavior among many private and/or individual lists
 * (in-memory repositories's internal datastores). We'll hence ignore this,
 * since this should not be the most relevant stuff for services unit tests
 * anyway. :)
 *
 * We do expose a flag to detect whether rollback happened though.
 */
export class InMemoryTransactionManager implements TransactionManager {
  private _rollbackError: BaseError | undefined;

  public hadRollback() {
    return !!this._rollbackError;
  }

  public getRollbackReason(): Readonly<BaseError> | undefined {
    return this._rollbackError;
  }

  public executePipeline<E extends BaseError, R>(
    work: TaskEither<E, R>,
  ): TaskEither<E | IrrecoverableError, R> {
    return pipe(
      work,
      taskEither.mapLeft((error) => {
        this._rollbackError = error;
        return error;
      }),
    );
  }

  public getTx(): unknown {
    return undefined;
  }
}
