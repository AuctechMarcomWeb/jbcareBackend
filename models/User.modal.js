import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    address: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "supervisor", "landlord", "tenant"],
      default: "user",
    },
    profilePic:{
      type:String
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// instance method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ email: 1 });
userSchema.index({ siteId: 1 });
userSchema.index({ projectId: 1 });
userSchema.index({ unitId: 1 });
userSchema.index({ referenceId: 1 });

const User = mongoose.model("User", userSchema);
export default User;
