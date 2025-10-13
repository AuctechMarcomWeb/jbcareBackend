import jwt from "jsonwebtoken";
import User from "../models/User.modal.js";

export const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token)
    return res.status(401).json({ message: "Not authorized, token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user (without password) to request
    const user = await User.findById(decoded.id).select("-password");
    if (!user)
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Middleware to check role(s)
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: `Role (${req.user.role}) not authorized` });
    }
    next();
  };
};
