import jwt from "jsonwebtoken";
import User from "../models/User.modal.js";

/**
 * Token-based authentication middleware
 * @param {boolean} required - if true, token must be present and valid
 */
export const protect =
  (required = false) =>
  async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Token missing
    if (!token) {
      if (required) {
        return res
          .status(401)
          .json({ success: false, message: "Not authorized, token missing" });
      } else {
        req.user = null; // optional token
        return next();
      }
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        if (required) {
          return res.status(401).json({
            success: false,
            message: "Not authorized, user not found",
          });
        } else {
          req.user = null;
          return next();
        }
      }

      req.user = user;
      next();
    } catch (err) {
      if (required) {
        return res
          .status(401)
          .json({ success: false, message: "Not authorized, token invalid" });
      } else {
        req.user = null;
        return next();
      }
    }
  };

/**
 * Role-based access middleware (independent of token)
 * @param  {...string} roles - allowed roles
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log(
      "Request details:",
      req.headers["x-role"] ||
        req.body.role ||
        req.params.role ||
        req.query.role
    );
    const role =
      req.headers["x-role"] ||
      req.body.role ||
      req.params.role ||
      req.query.role;

    console.log("Role found:", role, "Allowed roles:", roles);

    if (!role) {
      return res.status(403).json({
        success: false,
        message: "Access denied: role not provided",
      });
    }

    const allowed = roles.map((r) => r.toLowerCase());
    if (!allowed.includes(role.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Requires role(s) [${roles.join(", ")}]`,
      });
    }

    next();
  };
};
