"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _applyDecoratedDescriptor2 = _interopRequireDefault(require("@babel/runtime/helpers/applyDecoratedDescriptor"));

var _coreDecorators = require("core-decorators");

var _knockout = _interopRequireDefault(require("knockout"));

var _class, _temp;

var log = function log() {}; // const log = console.log;


var UndoManager = (_class = (_temp =
/*#__PURE__*/
function () {
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
  function UndoManager(vm) {
    var _this = this;

    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
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
    this.steps(steps);
    this.throttle(throttle);
    this.startListening(vm);
  }

  (0, _createClass2.default)(UndoManager, [{
    key: "startListening",
    value: function startListening(vm) {
      var _this2 = this;

      if (this.isUndoable(vm)) {
        if (this._subscriptions.has(vm)) return;
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
                  _this2.startListening(change.value);

                  subject.splice(change.index + offset++, 0, change.value);
                  return subject;

                case 'deleted':
                  subject.splice(change.index + offset--, 1);

                  _this2.stopListening(change.value);

                  return subject;

                default:
                  return subject;
              }
            }, previousValue);

            _this2.onChange({
              observable: observable,
              nextValue: nextValue,
              previousValue: previousValue
            });

            previousValue = nextValue;
          }, null, 'arrayChange');

          this._subscriptions.set(vm, subscription);

          this._subscriptionsCount++;
          previousValue.forEach(function (item) {
            return _this2.startListening(item);
          });
        } else {
          var _subscription = observable.subscribe(function (nextValue) {
            _this2.onChange({
              observable: observable,
              nextValue: nextValue,
              previousValue: previousValue
            });

            previousValue = nextValue;
          });

          this._subscriptions.set(vm, _subscription);

          this._subscriptionsCount++;
        }
      } else if ((0, _typeof2.default)(vm) === 'object') {
        var _arr = Object.values(vm);

        for (var _i = 0; _i < _arr.length; _i++) {
          var item = _arr[_i];
          this.startListening(item);
        }
      }
    }
  }, {
    key: "stopListening",
    value: function stopListening(vm) {
      if (this.isUndoable(vm)) {
        var observable = vm;
        var previousValue = observable.peek();

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

      if ((0, _typeof2.default)(vm) === 'object') {
        var _arr2 = Object.values(vm);

        for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
          var item = _arr2[_i2];
          this.stopListening(item);
        }
      }
    }
  }, {
    key: "takeSnapshot",
    value: function takeSnapshot() {
      clearTimeout(this.recording());
      this.past.splice(0, this.past().length - this.steps());
      this.future([]);
      this._changeset = [];
      this.recording(null);
    }
  }, {
    key: "onChange",
    value: function onChange(_ref2) {
      var _this3 = this;

      var observable = _ref2.observable,
          nextValue = _ref2.nextValue,
          previousValue = _ref2.previousValue;
      if (this._ignoreChanges) return;
      if (this.recording()) clearTimeout(this.recording()); // reset timeout
      else this.past.push(this._changeset); // push the changeset immediatelly

      var atomicChange = {
        observable: observable,
        nextValue: nextValue,
        previousValue: previousValue
      };

      this._changeset.push(atomicChange);

      if (this.throttle()) this.recording(setTimeout(function () {
        return _this3.takeSnapshot();
      }, this.throttle()));else this.takeSnapshot();
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.past([]);
      this.future([]); // this._subscriptions.forEach((subscription) => subscription.dispose());
      // this._subscriptions = [];
    }
  }, {
    key: "undo",
    value: function undo() {
      var _this4 = this;

      if (!this.past().length) return;

      if (this.recording()) {
        clearTimeout(this.recording());
        this.recording(null);
      }

      var present = this.past.pop();
      this.future.push(present);
      this._ignoreChanges = true;
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
        return _this4._ignoreChanges = false;
      });
    }
  }, {
    key: "redo",
    value: function redo() {
      var _this5 = this;

      if (!this.future().length) return;

      if (this.recording()) {
        clearTimeout(this.recording());
        this.recording(null);
      }

      var present = this.future.pop();
      this.past.push(present);
      this._ignoreChanges = true;
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
        return _this5._ignoreChanges = false;
      });
    }
  }, {
    key: "isUndoable",
    value: function isUndoable(vm) {
      return _knockout.default.isWritableObservable(vm) && _knockout.default.isSubscribable(vm);
    }
  }]);
  return UndoManager;
}(), _temp), ((0, _applyDecoratedDescriptor2.default)(_class.prototype, "startListening", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "startListening"), _class.prototype), (0, _applyDecoratedDescriptor2.default)(_class.prototype, "stopListening", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "stopListening"), _class.prototype), (0, _applyDecoratedDescriptor2.default)(_class.prototype, "takeSnapshot", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "takeSnapshot"), _class.prototype), (0, _applyDecoratedDescriptor2.default)(_class.prototype, "destroy", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "destroy"), _class.prototype), (0, _applyDecoratedDescriptor2.default)(_class.prototype, "undo", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "undo"), _class.prototype), (0, _applyDecoratedDescriptor2.default)(_class.prototype, "redo", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "redo"), _class.prototype), (0, _applyDecoratedDescriptor2.default)(_class.prototype, "isUndoable", [_coreDecorators.autobind], Object.getOwnPropertyDescriptor(_class.prototype, "isUndoable"), _class.prototype)), _class);
exports.default = UndoManager;