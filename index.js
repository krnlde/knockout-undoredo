import ko from 'knockout';

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
  undoCollection = [];

  _subscriptions = [];
  recording = null;
  _ignoreChanges = false;

  constructor(vm, {steps = 30, throttle = 300} = {}) {
    this.steps    = steps;
    this.throttle = throttle;
    this.startListening(vm);
  }

  startListening(vm) {
    if (this.isUndoable(vm)) {
      const observable = vm;
      let currentValue = observable.peek();

      if (Array.isArray(currentValue)) {
        currentValue = [...currentValue]; // clone

        this.startListening(currentValue);

        const subscription = observable.subscribe((changes) => {
          let nextValue;
          changes.forEach((change) => {
            switch (change.status) {
              case 'added':
                nextValue = currentValue.splice(change.index, 0, change.value);
                this.startListening(change.value);
                break;
              case 'deleted':
                nextValue = currentValue.splice(change.index, 1);
                this.stopListening(change.value);
                break;
            }
          });
          this.change({observable, nextValue, previousValue: currentValue});
          currentValue = nextValue;
        }, null, 'arrayChange');

        this._subscriptions.push(subscription);
      } else {
        const subscription = observable.subscribe((nextValue) => {
          this.change({observable, nextValue, previousValue: currentValue});
          currentValue = nextValue;
        });
        this._subscriptions.push(subscription);
      }
      return;
    }

    if (typeof vm === 'object') {
      const items = Object.values(vm);

      if (items.length) {
        for (let item of items) {
          this.startListening(item);
        }
        return;
      }
    }
  }

  stopListening(vm) {
    if (this.isUndoable(vm)) {
      const observable = vm;
      const currentValue = observable.peek();

      this._subscriptions = this._subscriptions.reduce((reduced, subscription) => {
        if (subscription._target === observable) {
          subscription.dispose();
        } else {
          reduced.push(subscription);
        }
        return reduced;
      }, []);

      if (Array.isArray(currentValue)) {
        this.stopListening(currentValue);
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

  change({observable, nextValue, previousValue}) {
    if (this._ignoreChanges) return;

    if (this.recording) clearTimeout(this.recording);
    else this.past.push(this.undoCollection);

    const atomicChange = {observable, nextValue, previousValue};
    this.undoCollection.push(atomicChange);

    const afterCollecting = () => {
      this.past = this.past.slice(-this.steps);
      this.future = [];
      this.undoCollection = [];
      this.recording = null;
    }

    if (this.throttle) this.recording = setTimeout(afterCollecting, this.throttle);
    else afterCollecting();
  }

  destroy() {
    this.past = [];
    this.future = [];
    this._subscriptions.forEach((subscription) => subscription.dispose());
    this._subscriptions = [];
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
            this.startListening(item);
          });
        }
        if (previousValue.length < targetArray.length) {
          targetArray.forEach((item) => {
            if (previousValue.includes(item)) return;
            observable.remove(item);
            this.stopListening(item);
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
    if (this.recording) {
      clearTimeout(this.recording);
      this.recording = null;
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
            this.startListening(item);
          });
        }
        if (nextValue.length < targetArray.length) {
          targetArray.forEach((item) => {
            if (nextValue.includes(item)) return;
            observable.remove(item);
            this.stopListening(item);
          });
        }
      } else {
        observable(nextValue);
      }
    });
    setTimeout(() => this._ignoreChanges = false);
    // console.log({past: this.past.length, future: this.future.length});
  }

  isUndoable(vm) {
    return ko.isWritableObservable(vm) && !ko.isComputed(vm) && ko.isSubscribable(vm);
  }
}
