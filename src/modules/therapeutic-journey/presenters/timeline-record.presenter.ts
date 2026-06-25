import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

@ApiSchema({
    description:
        "A representation of an event or action recorded in the patient's care trajectory (Timeline) " +
        "within their Projeto Terapêutico Singular (PTS).",
})
export class TimelineRecordPresenter {
    @ApiProperty({
        description: "The unique identifier of the timeline record.",
        format: "uuid"
    })
    public readonly id!: string;

    @ApiProperty({
        description: "The type of target which this record is about (e.g., PTS, Activity).",
        enum: TimelineRecord.TargetType,
    })
    public readonly target!: string;

    @ApiProperty({
        description: "The nature of the event being registered (e.g., Created, Approved, Edited).",
        enum: TimelineRecord.Type,
    })
    public readonly type!: string;

    @ApiProperty({
        description: "The unique identifier of the target entity within the platform.",
        format: "uuid"
    })
    public readonly targetId!: string;

    @ApiProperty({
        description: "A rich text — yet brief — that describes what happened."
    })
    public readonly description!: string;

    @ApiProperty({
        description: "The date and time when the action happened.",
        format: "date-time",
    })
    public readonly happenedAt!: string;

    @ApiProperty({
        description: "The ID of the Projeto Terapêutico Singular (PTS) to which this record is related.",
        format: "uuid",
    })
    public readonly ptsId!: string;

    @ApiProperty({
        description: "The ID of the professional who triggered this record, if applicable.",
        format: "uuid",
        required: false,
    })
    public readonly responsibleProfessionalId?: string;

    protected constructor(props: TimelineRecordPresenter) {
        Object.assign(this, props);
    }

    public static present(record: TimelineRecord) {
        const snapshot = record.toSnapshot();

        return new TimelineRecordPresenter({
            id: snapshot.id.toString(),
            target: snapshot.target,
            type: snapshot.type,
            targetId: snapshot.targetId.toString(),
            description: snapshot.description,
            happenedAt: snapshot.happenedAt.toISOString(),
            ptsId: snapshot.ptsId.toString(),
            responsibleProfessionalId: snapshot.responsibleProfessionalId?.toString(),
        });
    }
}