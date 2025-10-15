// authHelpers.js
import User from "../models/User.modal.js";

export const createUser = async ({ name, email, phone, password, role, referenceId }) => {
  // Check duplicate email/phone
  const existing = await User.findOne({ phone });
  if (existing) throw new Error("User with this phone already exists.");

  const user = await User.create({
    name,
    email,
    phone,
    password, // hash if your model hashes
    role,
    referenceId,
  });

  return user;
};
