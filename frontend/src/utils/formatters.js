/**
 * Reusable Formatting Utilities for VAYU-Index
 * Handles APIx scores, Indian Currency (INR), Percentages, and Moving Averages.
 */

/**
 * Format APIx score or Moving Average to exactly 2 decimal places.
 * Example: 191.23
 * @param {number|string} val - Numeric APIx value
 * @param {string} fallback - Fallback if value is null/undefined/NaN
 * @returns {string} Formatted APIx string (e.g. "114.80", "191.23")
 */
export const formatAPIx = (val, fallback = '100.00') => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return fallback;
  }
  return Number(val).toFixed(2);
};

/**
 * Format Average Fare in Indian Currency format with commas and rupee symbol.
 * Example: ₹8,245
 * @param {number|string} val - Fare amount in INR
 * @param {string} fallback - Fallback if value is null/undefined/NaN
 * @returns {string} Formatted currency string (e.g. "₹8,245")
 */
export const formatCurrencyINR = (val, fallback = '₹0') => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return fallback;
  }
  const rounded = Math.round(Number(val));
  return `₹${rounded.toLocaleString('en-IN')}`;
};

/**
 * Format Percentage to 1 decimal place with optional sign indicator.
 * Example: +3.4% or -1.2%
 * @param {number|string} val - Percentage value
 * @param {boolean} includeSign - Whether to prefix positive values with '+'
 * @param {string} fallback - Fallback if invalid
 * @returns {string} Formatted percentage string (e.g. "+3.4%", "-1.2%")
 */
export const formatPercentage = (val, includeSign = true, fallback = '0.0%') => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return fallback;
  }
  const num = Number(val);
  const formatted = Math.abs(num).toFixed(1);
  if (num > 0) {
    return includeSign ? `+${formatted}%` : `${formatted}%`;
  } else if (num < 0) {
    return `-${formatted}%`;
  }
  return `0.0%`;
};

/**
 * Format Moving Average to 2 decimal places.
 * Example: 113.20
 * @param {number|string} val - Moving average value
 * @param {string} fallback - Fallback if invalid
 * @returns {string} Formatted moving average (e.g. "113.20")
 */
export const formatMovingAvg = (val, fallback = '100.00') => {
  return formatAPIx(val, fallback);
};

/**
 * Format local system time as HH:MM:SS.
 * Example: "14:23:45"
 * @param {Date} date - Optional Date instance, defaults to new Date()
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export const formatTimeHHMMSS = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

