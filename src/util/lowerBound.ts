import type Comparator from "./Comparator.ts";
import { Compared } from "./Comparator.ts";

type Compare<T> = (first: T, second: T) => number;

function lowerBound<T extends Comparator<T>>(list: readonly T[], value: T): number;
function lowerBound<T>(list: readonly T[], value: T, compare: Compare<T>): number;
function lowerBound<T>(list: readonly T[], value: T, compare?: Compare<T>): number {
  let l: number = 0,
    r: number = list.length - 1,
    ans: number = list.length;

  while (l <= r) {
    let mid = Math.floor(l + (r - l) / 2);
    const comparison = compare === undefined
      ? (list[mid] as T & Comparator<T>).compareTo(value)
      : compare(list[mid], value);

    if (comparison === Compared.LESS) {
      l = mid + 1;
    } else {
      ans = mid;
      r = mid - 1;
    }
  }

  return ans;
}

export default lowerBound;
