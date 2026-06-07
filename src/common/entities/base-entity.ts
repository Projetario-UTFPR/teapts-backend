import { Equals } from "@/common/interfaces/equals";

export abstract class BaseEntity<TProps> implements Equals {
  protected _props: TProps;

  protected constructor(props: TProps) {
    this._props = props;
  }

  public abstract equals(other: unknown): boolean;
}
