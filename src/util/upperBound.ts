import Comparator, { Compared } from "./Comparator";

const upperBound = <T extends Comparator<T>>(list: T[], val: T): number => {
  let l: number = 0,
    r: number = list.length - 1,
    ans: number = list.length;

  while (l <= r) {
    let mid = Math.floor(l + (r - l) / 2);

    let res: number = val.compareTo(list[mid]);

    if (res == Compared.LESS || res === Compared.EQUAL) {
			l = mid + 1;
		}
    else if (res === Compared.GREATER) {
      ans = mid;
      r = mid - 1;
    }
  }

  return ans;
};

export default upperBound;
