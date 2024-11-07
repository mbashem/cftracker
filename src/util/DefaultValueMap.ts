import { isDefined } from "./util";

class DefaultValueMap<K, V> extends Map<K, V> {
	// private defaultValue: V;

	// constructor(defaultValue: V) {
	// 	super();
	// 	this.defaultValue = defaultValue;
	// }
	constructor() {
		super();
	}

	// get(key: K) {
	// 	let value = super.get(key);
	// 	if (!isDefined(value)) {
	// 		value = structuredClone(this.defaultValue);
	// 		console.log(value, this.defaultValue);
	// 		super.set(key, value);
	// 	}
	// 	return value;
	// }

	getOrSet(key: K, defaultValue: V) {
		let value = super.get(key);
		if (!isDefined(value)) {
			value = defaultValue;
			super.set(key, value);
		}

		return value;
	}
}

export default DefaultValueMap;