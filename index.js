import ko from 'knockout';

export default class UndoManager {
  MAX_UNDO_STEPS = 30;
  past = [];
  future = [];

  constructor(vm) {
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

  throttle = 300;
  undoStack = [];
  batchTimeout = null;
  ignoreChanges = false;

  change({observable, nextValue, previousValue}) {
    if (this.ignoreChanges) return;
    if (this.batchTimeout) clearTimeout(this.batchTimeout);

    const atomicChange = {observable, nextValue, previousValue};
    this.undoStack.push(atomicChange);

    this.batchTimeout = setTimeout(() => {
      this.past = this.past.slice(-this.MAX_UNDO_STEPS);
      this.past.push(this.undoStack);
      this.future = [];
      this.undoStack = [];
      this.batchTimeout = null;
    }, this.throttle);
  }

  destroy() {
    past = [];
    future = [];
  }

  undo() {
    if (!this.past.length) return;
    const present = this.past.pop();
    this.future.push(present);

    this.ignoreChanges = true;
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
    setTimeout(() => this.ignoreChanges = false);
    // console.log({past: this.past.length, future: this.future.length});
  }

  redo() {
    if (!this.future.length) return;
    const present = this.future.pop();
    this.past.push(present);

    this.ignoreChanges = true;
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
    setTimeout(() => this.ignoreChanges = false);
    // console.log({past: this.past.length, future: this.future.length});
  }

}
