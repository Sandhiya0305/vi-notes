import { Schema, model, type InferSchemaType } from 'mongoose';

const reportArchiveSchema = new Schema(
  {
    sessionId: { type: String, required: true },
    generatedAt: { type: String, required: true },
    verdict: { type: String, enum: ['HUMAN', 'AI_ASSISTED', 'AI_GENERATED'], required: true },
    confidenceScore: { type: Number, required: true },
    overallSuspicionScore: { type: Number, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type ReportArchiveRecord = InferSchemaType<typeof reportArchiveSchema>;

const ReportModel = model<ReportArchiveRecord>('ReportArchive', reportArchiveSchema);

export default ReportModel;
