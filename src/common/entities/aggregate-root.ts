import { Equals } from "@/common/interfaces/equals";

export abstract class AggregateRoot<TProps extends object> implements Equals {
  protected constructor(protected readonly _props: TProps) {}

  public abstract equals(other: AggregateRoot<TProps>);

  /**
   * Return a readonly clone of the internal state of the aggregate root.
   *
   * @note methods and prototype-specific properties don't exist in the
   * internal properties clone. Don't try to call any method, even when they
   * are suggested.
   */
  public toSnapshot(): Readonly<TProps> {
    // Making a deep clone of the properties (note that deep means cloning even the
    // properties of the properties) could be costly, you might think. Indeed, in a
    // scenario where we are pulling over 20000 PTS instances from the database — an
    // aggregate root that is relatively heavy —, this is not efficient, except that
    // this scenario is unrealistic in our architecture: we don't use domain entities,
    // let alone aggregates roots, for bulk listing; we use queries that fetch
    // readonly data, and only the necessary data, to present. Therefore, we wouldn't
    // even use this at all.
    return structuredClone(this._props);
  }
}
