/** What the requestDescriptionUpload handler returns to the resolver. */
export type RequestDescriptionUploadResult = {
  presignedUrl: string;
  descriptionFileId: string;
  expiresAt: Date;
};
