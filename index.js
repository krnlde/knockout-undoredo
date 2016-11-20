import ko from 'knockout';

export default class UndoManager {
  /**
   * Determins how many undo/redo steps will be stored in memory.
   * @type {Number}
   */
  MAX_UNDO_STEPS;

  /**
   * Stack for past state snapshots
   * @type {Array}
   */
  past = [];

  /**
   * Stack for future state snapshots
   * @type {Array}
   */
  future = [];

  /**
   * [throttle description]
   * @type {Number}
   */
  throttle = 300;

  /**
   * A collection for all changes done within the {@see throttle} timeout.
   * This acts as a full rollback path.
   * @type {Array}
   */
  undoCollection = [];

  _batchTimeout = null;
  _ignoreChanges = false;

  constructor(vm, {steps = 30, throttle = 300} = {}) {
    this.MAX_UNDO_STEPS = steps;
    this.throttle       = throttle;
    this.listen(vm);
  }

  listen(vm) {
    for (let [key, item] of Object.entries(vm)) {
      if (ko.isWritableObservable(item) && !ko.isComputed(item) && ko.isSubscribable(item)) {
        const observable = item;
        let previousValue = observable.peek();

        previousValue = Array.isArray(previousValue) ? [...previousValue] : previousValue;

        observable.subscribe((nextValue) => {
          nextValue = Array.isArray(nextValue) ? [...nextValue] : nextValue;
          this.change({observable, nextValue, previousValue});
          previousValue = nextValue;
        });

        if (Array.isArray(previousValue)) {
          previousValue.forEach((item) => this.listen(item));
        }
      }
    }
  }

  change({observable, nextValue, previousValue}) {
    if (this._ignoreChanges) return;
    if (this._batchTimeout) clearTimeout(this._batchTimeout);

    const atomicChange = {observable, nextValue, previousValue};
    this.undoCollection.push(atomicChange);

    const afterCollecting = () => {
      this.past.push(this.undoCollection);
      this.past = this.past.slice(-this.MAX_UNDO_STEPS);
      this.future = [];
      this.undoCollection = [];
      this._batchTimeout = null;
    }

    if (this.throttle) this._batchTimeout = setTimeout(afterCollecting, this.throttle);
    else afterCollecting();
  }

  destroy() {
    past = [];
    future = [];
  }

  undo() {
    if (!this.past.length) return;
    if (this._batchTimeout) {
      clearTimeout(this._batchTimeout);
      this._batchTimeout = null;
    }
    const present = this.past.pop();
    this.future.push(present);

    this._ignoreChanges = true;
    present.reverse().forEach(({observable, previousValue}) => {
      if (Array.isArray(previousValue)) {
        const targetArray = [...observable.peek()];
        if (previousValue.length > targetArray.length) {
          previousValue.forEach((item) => {
            if (targetArray.includes(item)) return;
            observable.push(item);
          });
        }
        if (previousValue.length < targetArray.length) {
          targetArray.forEach((item) => {
            if (previousValue.includes(item)) return;
            observable.remove(item);
          });
        }
      } else {
        observable(previousValue);
      }
    });
    setTimeout(() => this._ignoreChanges = false);
    // console.log({past: this.past.length, future: this.future.length});
  }

  redo() {
    if (!this.future.length) return;
    if (this._batchTimeout) {
      clearTimeout(this._batchTimeout);
      this._batchTimeout = null;
    }
    const present = this.future.pop();
    this.past.push(present);

    this._ignoreChanges = true;
    present.reverse().forEach(({observable, nextValue}) => {
      if (Array.isArray(nextValue)) {
        const targetArray = [...observable.peek()];
        if (nextValue.length > targetArray.length) {
          nextValue.forEach((item) => {
            if (targetArray.includes(item)) return;
            observable.push(item);
          });
        }
        if (nextValue.length < targetArray.length) {
          targetArray.forEach((item) => {
            if (nextValue.includes(item)) return;
            observable.remove(item);
          });
        }
      } else {
        observable(nextValue);
      }
    });
    setTimeout(() => this._ignoreChanges = false);
    // console.log({past: this.past.length, future: this.future.length});
  }

}
