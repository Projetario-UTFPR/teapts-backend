import { Global, Module } from "@nestjs/common";
import { S3Client } from "@aws-sdk/client-s3";
import { ConfigType } from "@nestjs/config";
import blobStorageConfig from "@/configs/blob-storage.config";
import { S3DocumentFilesStorage } from "@/infra/s3/storage-managers/s3-document-files.storage";
import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";

@Global()
@Module({
  providers: [
    {
      provide: S3Client,
      useFactory: (blobVars: ConfigType<typeof blobStorageConfig>) =>
        new S3Client({
          endpoint: blobVars.BLOB_STORAGE_URL,
          region: blobVars.BLOB_STORAGE_REGION,
          credentials: {
            accessKeyId: blobVars.BLOB_STORAGE_ACCESS_KEY,
            secretAccessKey: blobVars.BLOB_STORAGE_SECRET_KEY,
          },
        }),
      inject: [blobStorageConfig.KEY],
    },
    {
      provide: DocumentFilesStorage,
      useClass: S3DocumentFilesStorage,
    },
  ],
  exports: [DocumentFilesStorage],
})
export class S3Module {}
