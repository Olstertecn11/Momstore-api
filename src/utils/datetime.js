function toMySQLDateTime(date) {
  // MySQL DATETIME: 'YYYY-MM-DD HH:MM:SS'
  const pad = (n) => String(n).padStart(2, "0");
  const d = date instanceof Date ? date : new Date(date);

  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

module.exports = { toMySQLDateTime };
