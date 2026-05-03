import { BaseError } from "@/common/errors/base.error";

interface IConflictError {
  /**
   * A user-target message describing why and what conflict has happened.
   */
  message: string;
}

export class ConflictError extends BaseError implements IConflictError {
  public readonly message: string;

  public constructor({ message }: IConflictError) {
    super({});
    this.message = message;
  }
}
