import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export type UserRole = 'admin' | 'user';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.set('toJSON', {
  transform(_doc: unknown, ret: Record<string, unknown>) {
    delete ret.passwordHash;
    delete ret.passwordSalt;
    ret.id = String(ret._id);
    return ret;
  },
});

export type UserRecord = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserRecord>;

const UserModel = model<UserRecord>('User', userSchema);

export default UserModel;
