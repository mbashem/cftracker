export enum Compared {
	LESS = -1,
	EQUAL = 0,
	GREATER = 1
}

export default interface Comparator<T> {
  compareTo(a:T): number;
}
