import { TimeUnit } from "@/common/time/value-objects/frequency.vo";
import { DTO } from "@/infra/http/dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const timeUnitValues = Object.values(TimeUnit) as [string, ...string[]];

const timeDurationSchema = z.tuple([
  z.number().int().positive("A duração precisa ser um valor inteiro e positivo."),
  z.enum(timeUnitValues as [TimeUnit, ...TimeUnit[]]),
]);

const timeIntervalSchema = z.union([
  z.enum(timeUnitValues as [TimeUnit, ...TimeUnit[]]),
  z.tuple([
    z.number().int().positive("O intervalo precisa ser um valor inteiro e positivo."),
    z.enum(timeUnitValues as [TimeUnit, ...TimeUnit[]]),
  ]),
]);

const frequencySchema = z.object({
  times: z
    .number()
    .int()
    .positive("A quantidade de vezes precisa ser um valor inteiro e positivo."),
  interval: timeIntervalSchema,
  duration: timeDurationSchema.optional(),
});

type FrequencySchema = z.infer<typeof frequencySchema>;

export class FrequencyDto extends DTO implements FrequencySchema {
  protected schema = frequencySchema;

  @Expose()
  @ApiProperty({
    description: "How many times the frequency repeats per interval.",
    type: "number",
    example: 3,
  })
  public readonly times!: number;

  @Expose()
  @ApiProperty({
    description:
      "The interval between repetitions. Can be a TimeUnit string (e.g. 'day') " +
      "or a tuple of [number, TimeUnit] (e.g. [3, 'week']).",
    oneOf: [
      { type: "string", enum: timeUnitValues, example: "day" },
      {
        type: "array",
        items: {
          allOf: [
            { type: "number", example: 3 },
            { type: "string", enum: timeUnitValues, example: "week" },
          ],
        },
        minItems: 2,
        maxItems: 2,
      },
    ],
  })
  public readonly interval!: FrequencySchema["interval"];

  @Expose()
  @ApiPropertyOptional({
    description:
      "Optional total duration over which the frequency applies, as a tuple of [number, TimeUnit].",
    type: "array",
    items: {
      allOf: [
        { type: "number", example: 2 },
        { type: "string", enum: timeUnitValues, example: "month" },
      ],
    },
    minItems: 2,
    maxItems: 2,
    example: [2, "month"],
  })
  public readonly duration?: FrequencySchema["duration"];
}

export namespace FrequencyDto {
  export const schema = frequencySchema;
}
