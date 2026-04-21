export interface IBaseError {
  cause?: BaseError | Error;
}

export abstract class BaseError extends Error {
  protected _cause: BaseError | Error | undefined;

  public constructor({ cause }: IBaseError) {
    super();
    this._cause = cause;
  }

  public get cause() {
    return this._cause;
  }
}
