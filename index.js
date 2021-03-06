import ko from 'knockout';

export default class UndoManager {
  /**
   * Determins how many undo/redo steps will be stored in memory.
   * @type {Number}
   */
  steps = ko.observable(30);

  /**
   * Stack for past state snapshots
   * @type {Array}
   */
  past = ko.observableArray([]);

  /**
   * Stack for future state snapshots
   * @type {Array}
   */
  future = ko.observableArray([]);


  /**
   * [throttle description]
   * @type {Number}
   */
  throttle = ko.observable(300);

  /**
   * Returns a boolean of whether there are undo-steps or not
   * @return {Boolean}   has undo steps
   */
  hasUndo = ko.pureComputed(() => Boolean(this.past().length) );

  /**
   * Returns a boolean of whether there are redo-steps or not
   * @return {Boolean}   has redo steps
   */
  hasRedo = ko.pureComputed(() => Boolean(this.future().length) );

  /**
   * A collection for all changes done within the {@see throttle} timeout.
   * This acts as a full rollback path.
   * @type {Array}
   */
  _changeset = [];

  /**
   * TimeoutId when recording is active
   * @type {int}
   */
  recording = ko.observable();


  _subscriptions = new WeakMap();
  _subscriptionsCount = 0;
  _ignoreChanges = false;

  constructor({steps = 30, throttle = 300} = {}) {
    this.steps(steps);
    this.throttle(throttle);
  }


  startListening = (viewModel) => {
    const visited = new WeakSet();
    const _startListening = (vm) => {
      if (vm instanceof UndoManager) return;
      if (visited.has(vm)) return;
      if (this.isObject(vm)) visited.add(vm);
      if (this.isUndoable(vm)) {
        if (this._subscriptions.has(vm)) return;
        const observable = vm;
        let previousValue = observable.peek();

        if (Array.isArray(previousValue)) {
          previousValue = [...previousValue]; // clone

          const subscription = observable.subscribe((changes) => {

            let offset = 0;
            let nextValue = changes.reduce((subject, change) => {
              subject = [...subject];
              switch (change.status) {
                case 'added':
                  this.startListening(change.value);
                  subject.splice(change.index + offset++, 0, change.value);
                  return subject;
                case 'deleted':
                  subject.splice(change.index + offset--, 1);
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

          previousValue.forEach((item) => _startListening(item));
        } else {
          const subscription = observable.subscribe((nextValue) => {
            this.onChange({observable, nextValue, previousValue});
            previousValue = nextValue;
          });
          this._subscriptions.set(vm, subscription);
          this._subscriptionsCount++;
          _startListening(previousValue);
        }
      } else if (this.isObject(vm)) {
        Object.values(vm).forEach(item => _startListening(item));
      }
    }
    _startListening(viewModel);
  }

  stopListening = (viewModel) => {
    const visited = new WeakSet();

    const _stopListening = (vm) => {
      if (visited.has(vm)) return;
      if (this.isObject(vm)) visited.add(vm);
      if (this.isUndoable(vm)) {
        const observable = vm;
        const unwrapped = observable.peek();

        if (this._subscriptions.has(observable)) {
          this._subscriptions.get(observable).dispose();
          this._subscriptions.delete(observable);
          this._subscriptionsCount--;
        }

        _stopListening(unwrapped);
        return;
      }

      if (this.isObject(vm)) {
        Object.values(vm).forEach(item => _stopListening(item));
      }
    }
    _stopListening(viewModel);
  }

  isObject = (obj) => {
    return (obj && (obj instanceof Object) && !(obj instanceof Function));
  }
  takeSnapshot = () => {
    clearTimeout(this.recording());
    this.past.splice(0, this.past().length - this.steps());

    this.future([]);
    this._changeset = [];
    this.recording(null);
  }

  onChange = ({observable, nextValue, previousValue}) => {
    if (this._ignoreChanges) return;
    if (this.recording()) clearTimeout(this.recording()); // reset timeout
    else this.past.push(this._changeset); // push the changeset immediatelly

    const atomicChange = {observable, nextValue, previousValue};
    this._changeset.push(atomicChange);

    if (this.throttle()) this.recording(setTimeout(() => this.takeSnapshot(), this.throttle()));
    else this.takeSnapshot();
  }

  destroy = () => {
    this.past([]);
    this.future([]);
    // this._subscriptions.forEach((subscription) => subscription.dispose());
    // this._subscriptions = [];
  }

  undo = () => {
    if (!this.past().length) return;
    if (this.recording()) {
      clearTimeout(this.recording());
      this.recording(null);
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

  redo = () => {
    if (!this.future().length) return;
    if (this.recording()) {
      clearTimeout(this.recording());
      this.recording(null);
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

  isUndoable = (vm) => {
    return ko.isWritableObservable(vm) && ko.isSubscribable(vm);
  }
}
