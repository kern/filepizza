function statusPredicate(v) {
  if (v.length === 1) {
    return v.toUpperCase();
  } else {
    return 'is' + statusPredicate(v.charAt(0)) + v.substring(1);
  }
}

export default class Status {

  constructor(values) {
    this.value = values[0];
    this.values = values;

    for (let v of values) {
      this[statusPredicate(v)] = function () {
        return this.value === v;
      }
    }
  }

  get() {
    return this.value;
  }

  set(value) {
    if (this.values.indexOf(value) === -1)
      throw new Error('Unknown value');

    this.value = value;
  }

}
