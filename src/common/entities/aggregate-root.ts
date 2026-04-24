export abstract class AggregateRoot<TProps extends object> {
  protected constructor(protected readonly _props: TProps) {}

  public equals(other: AggregateRoot<TProps>) {
    if (this === other) return true;
    if (!(other instanceof this.constructor)) return false;
  }
}
