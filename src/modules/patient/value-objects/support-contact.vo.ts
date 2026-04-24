import { ValueObject } from "../../../common/entities/value-object";

export class SupportContact extends ValueObject {
  public constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly phone: string,
    public readonly email?: string,
  ) {
    super();
  }
}
