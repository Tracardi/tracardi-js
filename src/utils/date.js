export function toUTCISOStringWithMilliseconds(date) {
    const pad = (num, size = 2) => String(num).padStart(size, '0');

    // Format UTC date and time components
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    const milliseconds = pad(date.getUTCMilliseconds(), 3);

    // Construct the UTC ISO string with milliseconds
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}


