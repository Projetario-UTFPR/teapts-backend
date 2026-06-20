import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { Activity } from "@/modules/therapeutic-journey/aggregates/activity.aggregate";
import { ActivityRepository } from "@/modules/therapeutic-journey/repositories/activity.repository";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

interface ActivityReferringToDocuments {
  activityId: string;
  documentId: string;
}

export class InMemoryActivityRepository implements ActivityRepository {
  public items: Activity[] = [];

  public activityDocumentsRelation: ActivityReferringToDocuments[] = [];

  public async createNewActivity(
    activity: Activity,
  ): Promise<Either<IrrecoverableError, Activity>> {
    const snapshot = activity.toSnapshot();
    const activityId = snapshot.id;

    this.items.push(activity);

    snapshot.documentsIds.forEach((documentId) => {
      this.activityDocumentsRelation.push({
        activityId: activityId.toString(),
        documentId: documentId.toString(),
      });
    });

    return either.right(activity);
  }
}
