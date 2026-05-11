import { FrequencyIntegrityViolationError } from "@/common/time/errors/frequency-integrity-violation.error";
import { Frequency, TimeUnit } from "@/common/time/value-objects/frequency.vo";
import { either } from "fp-ts";

describe("Frequency", () => {
  it.each([
    Frequency.create({ times: 1.5, interval: TimeUnit.Day }),
    Frequency.create({ times: 1, interval: [2.5, TimeUnit.Day] }),
  ])("should not allow non-integer amount of times", (frequencyResult) => {
    assert(either.isLeft(frequencyResult));
    expect(frequencyResult.left).toBeInstanceOf(FrequencyIntegrityViolationError);
  });

  it.each([
    Frequency.create({ times: 0, interval: TimeUnit.Day }),
    Frequency.create({ times: -1, interval: TimeUnit.Day }),
    Frequency.create({ times: 1, interval: [0, TimeUnit.Day] }),
    Frequency.create({ times: 1, interval: [-10, TimeUnit.Day] }),
  ])("should not allow zero or negative amount of time unit values", (frequencyResult) => {
    assert(either.isLeft(frequencyResult));
    expect(frequencyResult.left).toBeInstanceOf(FrequencyIntegrityViolationError);
  });

  it.each(
    [
      [
        Frequency.createUnchecked({ interval: TimeUnit.Day, times: 1 }),
        Frequency.createUnchecked({ interval: [1, TimeUnit.Day], times: 1 }),
      ],
      [
        Frequency.createUnchecked({
          interval: [8, TimeUnit.Hour],
          times: 1,
          duration: [2, TimeUnit.Week],
        }),
        Frequency.createUnchecked({
          interval: [8, TimeUnit.Hour],
          times: 1,
          duration: [2, TimeUnit.Week],
        }),
      ],
      (() => {
        const frequency = Frequency.createUnchecked({ interval: TimeUnit.Day, times: 2 });
        return [frequency, frequency];
      })(),
    ].map((pairs) => [pairs]),
  )(
    "should correctly assert equality between equivalent frequencies for %#: %j",
    ([freq1, freq2]) => {
      expect(freq1.equals(freq2)).toBe(true);
      expect(freq2.equals(freq1)).toBe(true);
    },
  );
});
