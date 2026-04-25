import { BaseError } from "@/common/errors/base.error";

interface IInvalidArgumentError {
  /**
   * The name of the argument that caused this error.
   *
   * If the name is nested (e.g., an object property), it must be represented in
   * dot notation.
   *
   * @example "user.email"
   */
  field: string;
  /**
   * A user-targeted message describing what is wrong with the provided argument value.
   */
  errorMessage: string;
}

/**
 * Represents an error related to an invalid argument provided by the client user.
 *
 * This error is meant to be used in cases where the client user provided an argument
 * that is semantically correct but has an invalid value, such as a string with an
 * invalid format or a number that is out of range.
 */
export class InvalidArgumentError extends BaseError implements IInvalidArgumentError {
  public readonly field: string;
  public readonly errorMessage: string;

  public constructor({ errorMessage, field }: IInvalidArgumentError) {
    super({});

    this.field = field;
    this.errorMessage = errorMessage;
  }
}
