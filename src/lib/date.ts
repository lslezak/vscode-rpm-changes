/**
 * Format a number to be at least two digits, add a leading zero if needed
 * @param num the number to pad
 * @returns
 */
function padNumber(num: number): string {
  return num.toString().padStart(2, "0");
}

/**
 * Generate the current date string in the format used by RPM changes files
 * @returns {string} The current date string
 */
export function formatDate(date?: Date): string {
  const now = date || new Date();

  const weekday = now.toLocaleString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  const month = now.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = now.getUTCDate().toString().padStart(2, " ");
  const hours = padNumber(now.getUTCHours());
  const minutes = padNumber(now.getUTCMinutes());
  const seconds = padNumber(now.getUTCSeconds());
  const year = now.getUTCFullYear();

  return `${weekday} ${month} ${day} ${hours}:${minutes}:${seconds} UTC ${year}`;
}
