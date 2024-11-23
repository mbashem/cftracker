import { isDefined } from "./util";

class DefaultValueMap<K, V> extends Map<K, V> {
	constructor() {
		super();
	}

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