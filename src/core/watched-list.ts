export class WatchedList<T> {
  private current: T[] = [];
  private inserted: T[] = [];
  private removed: T[] = [];

  constructor(initValues: T[]) {
    this.current = initValues;
  }

  update(newValues: T[]): void {
    const currentSet = new Set(this.current);
    const newSet = new Set(newValues);

    this.inserted = newValues.filter((value) => !currentSet.has(value));

    this.removed = this.current.filter((value) => !newSet.has(value));

    this.current = newValues;
  }

  getCurrent(): T[] {
    return this.current;
  }
  getInserted(): T[] {
    return this.inserted;
  }
  getRemoved(): T[] {
    return this.removed;
  }
}
