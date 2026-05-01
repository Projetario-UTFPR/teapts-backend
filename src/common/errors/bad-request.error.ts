import { BaseError } from "@/common/errors/base.error";

interface IBadRequestError {
  /**
   * A developer-targeted message describing what triggered this error.
   * Note that Bad Request errors are used when the request is not consistent due to
   * some developer error. (I.e., the devolper from some front-end application consuming
   * services from this server.)
   */
  message: string;
}

/**
 * A error that is not possible to be treated by the client user because it either did not
 * originate in the server or it is a programming-level error that must be fixed by a developer.
 */

export class BadRequestError extends BaseError implements IBadRequestError {
  public readonly message: string;

  public constructor({ message }: IBadRequestError) {
    super({});
    this.message = message;
  }
}
