import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_METADATA_KEY = "isPublicRoute";
export const Public = () => SetMetadata(IS_PUBLIC_METADATA_KEY, true);
