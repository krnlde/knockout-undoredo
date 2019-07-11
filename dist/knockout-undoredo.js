"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es7.array.includes");

require("core-js/modules/es6.string.includes");

require("core-js/modules/es7.object.values");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

require("core-js/modules/es6.weak-set");

require("core-js/modules/web.dom.iterable");

require("core-js/modules/es6.array.iterator");

require("core-js/modules/es6.object.to-string");

require("core-js/modules/es6.string.iterator");

require("core-js/modules/es6.weak-map");

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _knockout = _interopRequireDefault(require("knockout"));

var UndoManager =
/**
 * Determins how many undo/redo steps will be stored in memory.
 * @type {Number}
 */

/**
 * Stack for past state snapshots
 * @type {Array}
 */

/**
 * Stack for future state snapshots
 * @type {Array}
 */

/**
 * [throttle description]
 * @type {Number}
 */

/**
 * Returns a boolean of whether there are undo-steps or not
 * @return {Boolean}   has undo steps
 */

/**
 * Returns a boolean of whether there are redo-steps or not
 * @return {Boolean}   has redo steps
 */

/**
 * A collection for all changes done within the {@see throttle} timeout.
 * This acts as a full rollback path.
 * @type {Array}
 */

/**
 * TimeoutId when recording is active
 * @type {int}
 */
function UndoManager() {
  var _this = this;

  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$steps = _ref.steps,
      steps = _ref$steps === void 0 ? 30 : _ref$steps,
      _ref$throttle = _ref.throttle,
      throttle = _ref$throttle === void 0 ? 300 : _ref$throttle;

  (0, _classCallCheck2.default)(this, UndoManager);
  (0, _defineProperty2.default)(this, "steps", _knockout.default.observable(30));
  (0, _defineProperty2.default)(this, "past", _knockout.default.observableArray([]));
  (0, _defineProperty2.default)(this, "future", _knockout.default.observableArray([]));
  (0, _defineProperty2.default)(this, "throttle", _knockout.default.observable(300));
  (0, _defineProperty2.default)(this, "hasUndo", _knockout.default.pureComputed(function () {
    return Boolean(_this.past().length);
  }));
  (0, _defineProperty2.default)(this, "hasRedo", _knockout.default.pureComputed(function () {
    return Boolean(_this.future().length);
  }));
  (0, _defineProperty2.default)(this, "_changeset", []);
  (0, _defineProperty2.default)(this, "recording", _knockout.default.observable());
  (0, _defineProperty2.default)(this, "_subscriptions", new WeakMap());
  (0, _defineProperty2.default)(this, "_subscriptionsCount", 0);
  (0, _defineProperty2.default)(this, "_ignoreChanges", false);
  (0, _defineProperty2.default)(this, "startListening", function (viewModel) {
    var visited = new WeakSet();

    var _startListening = function _startListening(vm) {
      if (vm instanceof UndoManager) return;
      if (visited.has(vm)) return;
      if (_this.isObject(vm)) visited.add(vm);

      if (_this.isUndoable(vm)) {
        if (_this._subscriptions.has(vm)) return;
        var observable = vm;
        var previousValue = observable.peek();

        if (Array.isArray(previousValue)) {
          previousValue = (0, _toConsumableArray2.default)(previousValue); // clone

          var subscription = observable.subscribe(function (changes) {
            var offset = 0;
            var nextValue = changes.reduce(function (subject, change) {
              subject = (0, _toConsumableArray2.default)(subject);

              switch (change.status) {
                case 'added':
                  _this.startListening(change.value);

                  subject.splice(change.index + offset++, 0, change.value);
                  return subject;

                case 'deleted':
                  subject.splice(change.index + offset--, 1);

                  _this.stopListening(change.value);

                  return subject;

                default:
                  return subject;
              }
            }, previousValue);

            _this.onChange({
              observable: observable,
              nextValue: nextValue,
              previousValue: previousValue
            });

            previousValue = nextValue;
          }, null, 'arrayChange');

          _this._subscriptions.set(vm, subscription);

          _this._subscriptionsCount++;
          previousValue.forEach(function (item) {
            return _startListening(item);
          });
        } else {
          var _subscription = observable.subscribe(function (nextValue) {
            _this.onChange({
              observable: observable,
              nextValue: nextValue,
              previousValue: previousValue
            });

            previousValue = nextValue;
          });

          _this._subscriptions.set(vm, _subscription);

          _this._subscriptionsCount++;

          _startListening(previousValue);
        }
      } else if (_this.isObject(vm)) {
        Object.values(vm).forEach(function (item) {
          return _startListening(item);
        });
      }
    };

    _startListening(viewModel);
  });
  (0, _defineProperty2.default)(this, "stopListening", function (viewModel) {
    var visited = new WeakSet();

    var _stopListening = function _stopListening(vm) {
      if (visited.has(vm)) return;
      if (_this.isObject(vm)) visited.add(vm);

      if (_this.isUndoable(vm)) {
        var observable = vm;
        var unwrapped = observable.peek();

        if (_this._subscriptions.has(observable)) {
          _this._subscriptions.get(observable).dispose();

          _this._subscriptions.delete(observable);

          _this._subscriptionsCount--;
        }

        _stopListening(unwrapped);

        return;
      }

      if (_this.isObject(vm)) {
        Object.values(vm).forEach(function (item) {
          return _stopListening(item);
        });
      }
    };

    _stopListening(viewModel);
  });
  (0, _defineProperty2.default)(this, "isObject", function (obj) {
    return obj && obj instanceof Object && !(obj instanceof Function);
  });
  (0, _defineProperty2.default)(this, "takeSnapshot", function () {
    clearTimeout(_this.recording());

    _this.past.splice(0, _this.past().length - _this.steps());

    _this.future([]);

    _this._changeset = [];

    _this.recording(null);
  });
  (0, _defineProperty2.default)(this, "onChange", function (_ref2) {
    var observable = _ref2.observable,
        nextValue = _ref2.nextValue,
        previousValue = _ref2.previousValue;
    if (_this._ignoreChanges) return;
    if (_this.recording()) clearTimeout(_this.recording()); // reset timeout
    else _this.past.push(_this._changeset); // push the changeset immediatelly

    var atomicChange = {
      observable: observable,
      nextValue: nextValue,
      previousValue: previousValue
    };

    _this._changeset.push(atomicChange);

    if (_this.throttle()) _this.recording(setTimeout(function () {
      return _this.takeSnapshot();
    }, _this.throttle()));else _this.takeSnapshot();
  });
  (0, _defineProperty2.default)(this, "destroy", function () {
    _this.past([]);

    _this.future([]); // this._subscriptions.forEach((subscription) => subscription.dispose());
    // this._subscriptions = [];

  });
  (0, _defineProperty2.default)(this, "undo", function () {
    if (!_this.past().length) return;

    if (_this.recording()) {
      clearTimeout(_this.recording());

      _this.recording(null);
    }

    var present = _this.past.pop();

    _this.future.push(present);

    _this._ignoreChanges = true;
    present.reverse().forEach(function (_ref3) {
      var observable = _ref3.observable,
          previousValue = _ref3.previousValue;

      if (Array.isArray(previousValue)) {
        var targetArray = (0, _toConsumableArray2.default)(observable.peek());

        if (previousValue.length > targetArray.length) {
          previousValue.forEach(function (item) {
            if (targetArray.includes(item)) return;
            observable.push(item);
          });
        }

        if (previousValue.length < targetArray.length) {
          targetArray.forEach(function (item) {
            if (previousValue.includes(item)) return;
            observable.remove(item);
          });
        }
      } else {
        observable(previousValue);
      }
    });
    setTimeout(function () {
      return _this._ignoreChanges = false;
    });
  });
  (0, _defineProperty2.default)(this, "redo", function () {
    if (!_this.future().length) return;

    if (_this.recording()) {
      clearTimeout(_this.recording());

      _this.recording(null);
    }

    var present = _this.future.pop();

    _this.past.push(present);

    _this._ignoreChanges = true;
    present.reverse().forEach(function (_ref4) {
      var observable = _ref4.observable,
          nextValue = _ref4.nextValue;

      if (Array.isArray(nextValue)) {
        var targetArray = (0, _toConsumableArray2.default)(observable.peek()); // clone

        if (nextValue.length > targetArray.length) {
          nextValue.forEach(function (item) {
            if (targetArray.includes(item)) return;
            observable.push(item);
          });
        }

        if (nextValue.length < targetArray.length) {
          targetArray.forEach(function (item) {
            if (nextValue.includes(item)) return;
            observable.remove(item);
          });
        }
      } else {
        observable(nextValue);
      }
    });
    setTimeout(function () {
      return _this._ignoreChanges = false;
    });
  });
  (0, _defineProperty2.default)(this, "isUndoable", function (vm) {
    return _knockout.default.isWritableObservable(vm) && _knockout.default.isSubscribable(vm);
  });
  this.steps(steps);
  this.throttle(throttle);
};

exports.default = UndoManager;