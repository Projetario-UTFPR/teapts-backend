import { type BaseError } from "@/common/errors/base.error";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { TaskEither } from "fp-ts/lib/TaskEither";

/**
 * Services might use this manager to execute multiple operations (over a datastore
 * common among them all) atomically.
 */
export abstract class TransactionManager<TransactionCtx = unknown> {
  public abstract executePipeline<E extends BaseError, R>(
    work: TaskEither<E, R>,
  ): TaskEither<E | IrrecoverableError, R>;

  public abstract getTx(): TransactionCtx | undefined;
}
