import jwt from "jsonwebtoken";
import User from "../models/User.modal.js";

export const protect = (required = true) => async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Token missing
  if (!token) {
    if (required) {
      return res.status(401).json({ success: false, message: "Not authorized, token missing" });
    } else {
      req.user = null; // optional token: no user attached
      return next();
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      if (required) {
        return res.status(401).json({ success: false, message: "Not authorized, user not found" });
      } else {
        req.user = null;
        return next();
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (required) {
      return res.status(401).json({ success: false, message: "Not authorized, token invalid" });
    } else {
      req.user = null;
      return next();
    }
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
