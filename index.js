import ko from 'knockout';

const log = () => {};
// const log = console.log;

export default class UndoManager {
  /**
   * Determins how many undo/redo steps will be stored in memory.
   * @type {Number}
   */
  steps;

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
  changeset = [];

  _subscriptions = new WeakMap();
  _subscriptionsCount = 0;
  recording = null;
  _ignoreChanges = false;

  constructor(vm, {steps = 30, throttle = 300} = {}) {
    this.steps    = steps;
    this.throttle = throttle;
    this.startListening(vm);
  }

  startListening(vm) {
    if (this.isUndoable(vm)) {
      if (this._subscriptions.has(vm)) return;
      const observable = vm;
      let previousValue = observable.peek();

      if (Array.isArray(previousValue)) {
        previousValue = [...previousValue]; // clone

        const subscription = observable.subscribe((changes) => {
          let nextValue = changes.reduce((subject, change) => {
            subject = [...subject];
            switch (change.status) {
              case 'added':
                this.startListening(change.value);
                subject.splice(change.index, 0, change.value);
                return subject;
              case 'deleted':
                subject.splice(change.index, 1);
                this.stopListening(change.value);
                return subject;
              default:
                return subject;
            }
          }, previousValue);

          this.onChange({observable, nextValue, previousValue});
          previousValue = nextValue;
        }, null, 'arrayChange');

        this._subscriptions.set(vm, subscription);
        this._subscriptionsCount++;

        previousValue.forEach((item) => this.startListening(item));
      } else {
        const subscription = observable.subscribe((nextValue) => {
          this.onChange({observable, nextValue, previousValue});
          previousValue = nextValue;
        });
        this._subscriptions.set(vm, subscription);
        this._subscriptionsCount++;
      }
    } else if (typeof vm === 'object') {
      const items = Object.values(vm);

      if (items.length) {
        for (let item of items) {
          this.startListening(item);
        }
      }
    }
  }

  stopListening(vm) {
    if (this.isUndoable(vm)) {
      const observable = vm;
      const previousValue = observable.peek();

      if (this._subscriptions.has(observable)) {
        this._subscriptions.get(observable).dispose();
        this._subscriptions.delete(observable);
        this._subscriptionsCount--;

      }

      if (Array.isArray(previousValue)) {
        this.stopListening(previousValue);
      }
      return;
    }

    if (typeof vm === 'object') {
      const items = Object.values(vm);

      if (items.length) {
        for (let item of items) {
          this.stopListening(item);
        }
        return;
      }
    }
  }

  takeSnapshot() {
    clearTimeout(this.recording);
    const waste = this.past.splice(0, this.past.length - this.steps);

    // // Garbage Collection
    // if (waste.length) {
    //   this.stopListening(waste);
    // }

    this.future = [];
    this.changeset = [];
    this.recording = null;
  }

  onChange({observable, nextValue, previousValue}) {
    if (this._ignoreChanges) return;
    if (this.recording) clearTimeout(this.recording); // reset timeout
    else this.past.push(this.changeset); // push the changeset immediatelly

    const atomicChange = {observable, nextValue, previousValue};
    this.changeset.push(atomicChange);

    if (this.throttle) this.recording = setTimeout(() => this.takeSnapshot(), this.throttle);
    else this.takeSnapshot();
  }

  destroy() {
    this.past = [];
    this.future = [];
    // this._subscriptions.forEach((subscription) => subscription.dispose());
    // this._subscriptions = [];
  }

  undo() {
    if (!this.past.length) return;
    if (this.recording) {
      clearTimeout(this.recording);
      this.recording = null;
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
  }

  redo() {
    if (!this.future.length) return;
    if (this.recording) {
      clearTimeout(this.recording);
      this.recording = null;
    }
    const present = this.future.pop();
    this.past.push(present);

    this._ignoreChanges = true;

    present.reverse().forEach(({observable, nextValue}) => {
      if (Array.isArray(nextValue)) {
        const targetArray = [...observable.peek()]; // clone

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
  }

  isUndoable(vm) {
    return ko.isWritableObservable(vm) && !ko.isComputed(vm) && ko.isSubscribable(vm);
  }
}
