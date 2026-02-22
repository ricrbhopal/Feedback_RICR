/**
 * Format a date to DD/MM/YYYY
 */
export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB');
};

/**
 * Format a time to HH:MM (24-hour) or hh:mm AM/PM
 */
export const formatTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
