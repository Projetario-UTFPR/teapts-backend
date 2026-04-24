import { BaseError, IBaseError } from "./base.error";

interface IUnauthorizedError {
  message: string;
}

export class UnauthorizedError extends BaseError implements IUnauthorizedError {
  public readonly message: string;

  public constructor({ message }: IUnauthorizedError, options: IBaseError = {}) {
    super(options);
    this.message = message;
  }
}
