import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import type { AuthenticityReport } from '../../types';

const keystrokeSchema = new Schema(
  {
    timestamp: { type: Number, required: true },
    key: { type: String, required: true },
    keyCategory: {
      type: String,
      enum: ['alpha', 'numeric', 'whitespace', 'punctuation', 'navigation', 'delete', 'modifier', 'special'],
      required: true,
    },
    intervalMs: { type: Number, required: true },
    documentLength: { type: Number, required: true },
  },
  { _id: false }
);

const pasteSchema = new Schema(
  {
    timestamp: { type: Number, required: true },
    insertedText: { type: String, required: true },
    insertedLength: { type: Number, required: true },
    documentLength: { type: Number, required: true },
  },
  { _id: false }
);

const editSchema = new Schema(
  {
    timestamp: { type: Number, required: true },
    type: { type: String, enum: ['insert', 'delete', 'replace'], required: true },
    delta: { type: Number, required: true },
    documentLength: { type: Number, required: true },
  },
  { _id: false }
);

const analysisSchema = new Schema<AuthenticityReport>(
  {
    sessionId: { type: String, required: true },
    generatedAt: { type: String, required: true },
    verdict: { type: String, enum: ['HUMAN', 'AI_ASSISTED', 'AI_GENERATED'], required: true },
    confidenceScore: { type: Number, required: true },
    overallSuspicionScore: { type: Number, required: true },
    naturalnessScore: { type: Number, required: true },
    reasons: [{ type: String, required: true }],
    metrics: {
      typingVariance: { type: Number, required: true },
      averageIntervalMs: { type: Number, required: true },
      pasteRatio: { type: Number, required: true },
      editRatio: { type: Number, required: true },
      wordCount: { type: Number, required: true },
    },
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    ownerId: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    documentSnapshot: { type: String, default: '' },
    keystrokes: { type: [keystrokeSchema], default: [] },
    pastes: { type: [pasteSchema], default: [] },
    edits: { type: [editSchema], default: [] },
    sessionDurationMs: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    analysis: { type: analysisSchema, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

sessionSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret._id = String(ret._id);
    return ret;
  },
});

export type SessionRecord = InferSchemaType<typeof sessionSchema>;
export type SessionDocument = HydratedDocument<SessionRecord>;

const SessionModel = model<SessionRecord>('Session', sessionSchema);

export default SessionModel;
