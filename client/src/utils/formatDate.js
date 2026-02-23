/**
 * Get current date/time in IST
 */
export const getISTNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

/**
 * Get today's date string in YYYY-MM-DD format (IST)
 */
export const getISTDateString = (date) => {
  const d = date || new Date();
  const istStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD
  return istStr;
};

/**
 * Get a date string offset by N days from today (IST) in YYYY-MM-DD
 */
export const getISTDateOffset = (offsetDays) => {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Convert a UTC date to IST date string YYYY-MM-DD
 */
export const toISTDateString = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Format a date to DD/MM/YYYY in IST
 */
export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
};

/**
 * Format a time to HH:MM AM/PM in IST
 */
export const formatTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });
};
