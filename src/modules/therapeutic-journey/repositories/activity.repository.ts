import { Either } from "fp-ts/lib/Either";
import { Activity } from "../aggregates/activity.aggregate";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { DocumentNotFoundError } from "@/modules/patient/errors/document-not-found-error";

export abstract class ActivityRepository {
    /**
     * @param activity newly created Activity
     * Saves newly created activity.
     */
    public abstract createNewActivity(activity: Activity): Promise<Either<IrrecoverableError | DocumentNotFoundError, Activity>>;
}
