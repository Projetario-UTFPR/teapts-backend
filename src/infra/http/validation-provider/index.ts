import type { HttpRequest } from "@/infra/http";
import { ValidationInterceptor } from "@/infra/http/validation-provider/interceptor";
import { ValidationPipe } from "@/infra/http/validation-provider/pipe";
import { HttpStatus, SetMetadata } from "@nestjs/common";

const METADATA_KEY = "coreValidationErrorConfig";
const HANDLER_KEY = "__handler_core_validation_error_config";

export type ValidationConfig = {
  /**
   * When present, this status will be forced into the response.
   * @default HttpStatus.UNPROCESSABLE_ENTITY
   */
  status?: HttpStatus;
};

/**
 * Extra configuration for how the DTO will be validated.
 * May be omitted when no custom configuration is set.
 */
export const ConfigValidation = (config: ValidationConfig) => {
  return SetMetadata(METADATA_KEY, config);
};

function attachConfigsToRequest(request: HttpRequest, config: ValidationConfig = {}) {
  request[HANDLER_KEY] = config;
}

function getConfigsFromRequest(request: HttpRequest): ValidationConfig {
  return request[HANDLER_KEY];
}

export default {
  Config: ConfigValidation,
  Pipe: ValidationPipe,
  Interceptor: ValidationInterceptor,
  metadataKey: METADATA_KEY,
  requestKey: HANDLER_KEY,
  attachConfigsToRequest,
  getConfigsFromRequest,
};
