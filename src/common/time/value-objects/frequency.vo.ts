import { ValueObject } from "@/common/entities/value-object";
import { FrequencyIntegrityViolationError } from "@/common/time/errors/frequency-integrity-violation.error";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

export enum TimeUnit {
  Second = "second",
  Minute = "minute",
  Hour = "hour",
  Day = "day",
  Week = "week",
  Month = "month",
  Year = "year",
}

export type TimeInterval = TimeUnit | readonly [number, TimeUnit];
export type TimeDuration = readonly [number, TimeUnit];

interface IFrequency {
  readonly times: number;
  readonly interval: TimeInterval;
  readonly duration?: TimeDuration;
}

/**
 * Represents a time frequency (with amount of times, a duration and an interval)
 *
 * @example
 * ```ts
 * // 3 times per day for 2 months
 * Frequency.create({
 *  times: 3,
 *  interval: TimeUnit.Day,
 *  duration: [2, TimeUnit.Month]
 * })
 * ```
 *
 * @example
 * ```ts
 * // once every three weeks for a year
 * Frequency.create({
 *  times: 1,
 *  interval: [3, TimeUnit.Week],
 *  duration: [1, TimeUnit.Year]
 * })
 * ```
 */
export class Frequency extends ValueObject implements IFrequency {
  public readonly interval: TimeInterval;
  private constructor(
    public readonly times: number,
    interval: TimeInterval,
    public readonly duration?: TimeDuration,
  ) {
    super();
    this.interval = Frequency.normalizeInterval(interval);
  }
  public static create({ interval, times, duration }: IFrequency) {
    const [intervalNum, intervalUnit] = Array.isArray(interval)
      ? (interval as Exclude<TimeInterval, TimeUnit>) // typescript shit to get type hints for the destructured vars
      : ([1, interval as TimeUnit] as const);

    return pipe(
      e.Do,
      e.bind("timesNum", () => this.ensurePositiveInteger(times, "A quantidade de vezes")),
      e.bind("intervalNum", () => this.ensurePositiveInteger(intervalNum, "O intervalo")),
      e.bind("durationNum", () =>
        duration ? this.ensurePositiveInteger(duration[0], "A duração") : e.right(undefined),
      ),
      e.map(({ durationNum, intervalNum, timesNum }) => {
        let resolvedDuration: TimeDuration | undefined = undefined;
        if (durationNum && duration) resolvedDuration = [durationNum, duration[1]] as const;
        const resolvedInterval = [intervalNum, intervalUnit] as const;

        return new Frequency(timesNum, resolvedInterval, resolvedDuration);
      }),
    );
  }

  /**
   * Creates a frequency without performing any check.
   *
   * @note This should only be used to rehydrate an instance of frequency from some
   * previously existing frequency payload.
   */
  public static createUnchecked({ interval, times, duration }: IFrequency) {
    return new Frequency(times, interval, duration);
  }

  private static ensurePositiveInteger(value: number, label: string) {
    if (value > 0 && Number.isInteger(value)) return e.right(value);

    const message = `${label} precisa ser um valor inteiro e positivo (maior que zero).`;
    return e.left(new FrequencyIntegrityViolationError({ message }));
  }

  private static normalizeInterval(interval: TimeInterval) {
    if (Array.isArray(interval) && interval[0] === 1) return interval[1];
    return interval;
  }
}
