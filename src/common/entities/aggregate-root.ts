export abstract class AggregateRoot<TProps extends object> {
  protected constructor(protected readonly _props: TProps) {}

  public abstract equals(other: AggregateRoot<TProps>);
}
