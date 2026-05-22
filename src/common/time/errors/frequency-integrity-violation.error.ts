import { BadRequestError } from "@/common/errors/bad-request.error";

/**
 * Represents a frequency inconsistency.
 */
export class FrequencyIntegrityViolationError extends BadRequestError {}
