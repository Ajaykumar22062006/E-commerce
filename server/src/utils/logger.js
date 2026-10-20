// Structured logger for BuildMart
export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  audit: (action, actor, details = {}) => {
    console.log(`[AUDIT] [${new Date().toISOString()}] Action: ${action} | By: ${actor}`, JSON.stringify(details));
  }
};

export default logger;
