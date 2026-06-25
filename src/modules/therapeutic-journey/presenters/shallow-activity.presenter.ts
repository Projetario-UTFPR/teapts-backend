import { FrequencyPresenter } from "@/common/time/presenters/frequency.presenter";
import { Activity } from "@/modules/therapeutic-journey/aggregates/activity.aggregate";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

@ApiSchema({
  description:
    "A summarized and shallow representation of a activity from some " +
    "patient's Projeto Terapêutico Singular (PTS)",
})
export class ShallowActivityPresenter {
  @ApiProperty({ description: "The unique identifier of the activity.", format: "uuid" })
  public readonly id!: string;

  @ApiProperty({ description: "The name or brief summary of the action to be performed." })
  public readonly title!: string;

  @ApiProperty({
    description:
      "The recurrence rules defining how often and for how long the activity should be executed.",
    type: FrequencyPresenter,
  })
  public readonly frequency!: FrequencyPresenter;

  @ApiProperty({
    description: "The current execution or lifecycle status of the activity.",
    enum: Activity.State,
  })
  public readonly state!: string;

  @ApiProperty({
    description: "The date and time when the activity was registered in the system.",
    format: "date-time",
  })
  public readonly createdAt!: string;

  protected constructor(props: ShallowActivityPresenter) {
    Object.assign(this, props);
  }

  public static present(activity: Activity) {
    const snapshot = activity.toSnapshot();
    return new ShallowActivityPresenter({
      id: snapshot.id.toString(),
      state: snapshot.state,
      title: snapshot.title,
      frequency: FrequencyPresenter.present(snapshot.frequency),
      createdAt: snapshot.createdAt.toISOString(),
    });
  }
}
