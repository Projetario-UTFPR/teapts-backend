import { BaseError, IBaseError } from "./base.error";

interface IforbiddenError {
  message?: string;
}

const defaultMessage = "Você não tem permissão.";

export class ForbiddenError extends BaseError implements IforbiddenError {
  public readonly message: string;

  public constructor({ message = defaultMessage }: IforbiddenError = {}, options: IBaseError = {}) {
    super(options);
    this.message = message;
  }
}
