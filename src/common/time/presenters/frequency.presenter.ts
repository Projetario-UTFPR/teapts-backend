import { Frequency, TimeUnit, type TimeDuration } from "@/common/time/value-objects/frequency.vo";
import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";

@ApiSchema({ description: "Describes the frequency that some action must be executed." })
export class FrequencyPresenter {
  @ApiProperty({
    description:
      "The number of times the action should be executed within the defined interval (e.g., 3 times).",
  })
  public readonly times!: number;

  @ApiProperty({
    description: "The unit of time that defines the recurrence of the frequency.",
    type: "array",
    items: {
      oneOf: [{ type: "number" }, { type: "string", enum: Object.values(TimeUnit) }],
    },
    maxItems: 2,
    minItems: 2,
    example: [1, "day"],
  })
  public readonly interval!: TimeDuration;

  @ApiPropertyOptional({
    description: "The total period or time window during which the repetition should occur.",
    type: "array",
    items: {
      oneOf: [{ type: "number" }, { type: "string", enum: Object.values(TimeUnit) }],
    },
    maxItems: 2,
    minItems: 2,
    example: [6, "month"],
  })
  public readonly duration?: TimeDuration;

  protected constructor(props: FrequencyPresenter) {
    Object.assign(this, props);
  }

  public static present(frequency: Frequency) {
    return new FrequencyPresenter({
      duration: frequency.duration,
      interval:
        typeof frequency.interval === "string" ? [1, frequency.interval] : frequency.interval,
      times: frequency.times,
    });
  }
}
