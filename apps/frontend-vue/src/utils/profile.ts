/**
 * Label of a number of restaurants rated: "1 restaurant", "3 restaurants", "0 restaurants"
 */
export function restaurantCountLabel(count: number): string {
  return `${count} restaurant${count === 1 ? '' : 's'}`
}
