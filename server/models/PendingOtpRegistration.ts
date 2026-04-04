import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const pendingOtpRegistrationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    passwordSalt: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
      default: 'user',
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    otpSalt: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

pendingOtpRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PendingOtpRegistrationRecord = InferSchemaType<typeof pendingOtpRegistrationSchema>;
export type PendingOtpRegistrationDocument = HydratedDocument<PendingOtpRegistrationRecord>;

const PendingOtpRegistrationModel = model<PendingOtpRegistrationRecord>('PendingRegistration', pendingOtpRegistrationSchema);

export default PendingOtpRegistrationModel;
