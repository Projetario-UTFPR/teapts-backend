import { BaseError, IBaseError } from "./base.error";

interface IResourceNotFoundError {
  /**
   * The entity that was to be found.
   */
  subject: string;
  /**
   * A message to be sent in the response body.
   */
  message: string;
}

export class ResourceNotFoundError extends BaseError implements IResourceNotFoundError {
  public readonly subject: string;
  public readonly message: string;

  public constructor({ message, subject }: IResourceNotFoundError, options: IBaseError = {}) {
    super(options);
    this.message = message;
    this.subject = subject;
  }
}
