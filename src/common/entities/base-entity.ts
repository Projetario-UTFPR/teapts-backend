export abstract class BaseEntity<TProps> {
  protected _props: TProps;

  protected constructor(props: TProps) {
    this._props = props;
  }

  public abstract equals(other: unknown): boolean;
}
