export function subtractOneDay(date: string) {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() - 1);

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function addOneDay(date: string) {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() + 1);

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Los meses son base 0
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
