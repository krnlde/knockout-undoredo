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
      let previousValue = observable.peek();

      if (Array.isArray(previousValue)) {
        previousValue = [...previousValue]; // clone

        const subscription = observable.subscribe((changes) => {
          let nextValue = changes.reduce((subject, change) => {
            log('- Array Event:', change.status);
            switch (change.status) {
              case 'added':
                this.startListening(change.value);
                log('Start listening to', ko.unwrap(change.value).toString(), this._subscriptions.length, 'listeners');
                subject = [...subject];
                subject.splice(change.index, 0, change.value)
                return subject;
              case 'deleted':
                this.stopListening(change.value);
                log('Stop listening to', ko.unwrap(change.value).toString(), this._subscriptions.length, 'listeners');
                subject = [...subject];
                subject.splice(change.index, 1);
                return subject;
              default:
                return [...subject];
            }
          }, [...previousValue]);

          this.onChange({observable, nextValue, previousValue});
          previousValue = [...nextValue];
        }, null, 'arrayChange');

        this._subscriptions.push(subscription);
        // log('Added [array]', this._subscriptions.length, 'listeners')

        this.startListening(previousValue);
      } else {
        const subscription = observable.subscribe((nextValue) => {
          this.onChange({observable, nextValue, previousValue});
          previousValue = nextValue;
        });
        this._subscriptions.push(subscription);
        // log('Added', observable.peek(), this._subscriptions.length, 'listeners');
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
      const previousValue = observable.peek();

      this._subscriptions = this._subscriptions.reduce((reduced, subscription) => {
        if (subscription._target === observable) {
          subscription.dispose();
        } else {
          reduced.push(subscription);
        }
        return reduced;
      }, []);

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
    this.past = this.past.slice(-this.steps);
    this.future = [];
    this.changeset = [];
    this.recording = null;
    log('BEGIN NEW CHANGESET');
    log(this.past.length, 'items in history');
  }

  onChange({observable, nextValue, previousValue}) {
    if (this._ignoreChanges) return;
    log('CHANGE REGISTERED');
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

    log(present.length, 'steps');
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

    this._ignoreChanges = false;
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

    log('Changeset contains steps:', present.length);
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

    this._ignoreChanges = false;
  }

  isUndoable(vm) {
    return ko.isWritableObservable(vm) && !ko.isComputed(vm) && ko.isSubscribable(vm);
  }
}
