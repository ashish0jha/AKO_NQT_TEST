import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    // Encrypted (see utils/crypto.js) — each user supplies their own Groq
    // API key so a deployed instance doesn't run test generation on the
    // deployer's shared quota/billing. Never sent back to the client;
    // only a masked preview (groqKeyPreview, virtual) is exposed.
    groqApiKeyEncrypted: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
    hasGroqKey: !!this.groqApiKeyEncrypted,
  };
};

export default mongoose.model("User", userSchema);
