/**
 * Extracts the `Right` variant's type of a fp-ts `Either<Left, Right>`.
 */
export type AsRight<T> = T extends { _tag: "Right"; right: infer TSuccess } ? TSuccess : never;
