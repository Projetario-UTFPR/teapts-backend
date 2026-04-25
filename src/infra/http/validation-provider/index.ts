import type { HttpRequest } from "@/infra/http";
import { ValidationInterceptor } from "@/infra/http/validation-provider/interceptor";
import { HttpStatus, SetMetadata, ValidationPipe } from "@nestjs/common";

const METADATA_KEY = "coreValidationErrorConfig";
const HANDLER_KEY = "__handler_core_validation_error_config";

export type ValidationConfig = {
  /**
   * When present, this status will be forced into the response.
   */
  status?: HttpStatus;
};

export const ConfigCoreValidation = (config: ValidationConfig) => {
  return SetMetadata(METADATA_KEY, config);
};

function attachConfigsToRequest(request: HttpRequest, config: ValidationConfig = {}) {
  request[HANDLER_KEY] = config;
}

function getConfigsFromRequest(request: HttpRequest): ValidationConfig {
  return request[HANDLER_KEY];
}

export default {
  Config: ConfigCoreValidation,
  Pipe: ValidationPipe,
  Interceptor: ValidationInterceptor,
  metadataKey: METADATA_KEY,
  requestKey: HANDLER_KEY,
  attachConfigsToRequest,
  getConfigsFromRequest,
};
