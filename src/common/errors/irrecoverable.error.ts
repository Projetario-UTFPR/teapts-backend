import { BaseError } from "./base.error";

interface IIRrecoverableError {
  /**
   * A developer-targeted message describing what possibly triggered this error.
   */
  message: string;
  /**
   * The original captured error.
   */
  cause: Error;
}

/**
 * A error that is not possible to be treated by the client user because it either did not
 * originate in the server or it is a programming-level error that must be fixed by a developer.
 */
export class IrrecoverableError extends BaseError implements IIRrecoverableError {
  public readonly message: string;

  public get cause() {
    return this._cause as IIRrecoverableError["cause"];
  }

  public constructor({ cause, message }: IIRrecoverableError) {
    super({ cause });
    this.message = message;
  }
}
