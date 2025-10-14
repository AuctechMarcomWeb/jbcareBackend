// utils/responseHandler.js

export const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = { success, message };
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

export const sendSuccess = (res, message, data = null, code = 200) => {
  return sendResponse(res, code, true, message, data);
};

export const sendError = (res, message, code = 500, error = null) => {
  const response = { success: false, message };
  if (error) response.error = error;
  return res.status(code).json(response);
};
