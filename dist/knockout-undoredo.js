'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _getOwnPropertyDescriptor = require('babel-runtime/core-js/object/get-own-property-descriptor');

var _getOwnPropertyDescriptor2 = _interopRequireDefault(_getOwnPropertyDescriptor);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _weakMap = require('babel-runtime/core-js/weak-map');

var _weakMap2 = _interopRequireDefault(_weakMap);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _desc, _value, _class;

var _coreDecorators = require('core-decorators');

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

var log = function log() {};
// const log = console.log;

var UndoManager = (_class = function () {

  /**
   * TimeoutId when recording is active
   * @type {int}
   */


  /**
   * Returns a boolean of whether there are redo-steps or not
   * @return {Boolean}   has redo steps
   */


  /**
   * [throttle description]
   * @type {Number}
   */


  /**
   * Stack for past state snapshots
   * @type {Array}
   */
  function UndoManager(vm) {
    var _this = this;

    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$steps = _ref.steps,
        steps = _ref$steps === undefined ? 30 : _ref$steps,
        _ref$throttle = _ref.throttle,
        throttle = _ref$throttle === undefined ? 300 : _ref$throttle;

    (0, _classCallCheck3.default)(this, UndoManager);
    this.steps = _knockout2.default.observable(30);
    this.past = _knockout2.default.observableArray([]);
    this.future = _knockout2.default.observableArray([]);
    this.throttle = _knockout2.default.observable(300);
    this.hasUndo = _knockout2.default.pureComputed(function () {
      return Boolean(_this.past().length);
    });
    this.hasRedo = _knockout2.default.pureComputed(function () {
      return Boolean(_this.future().length);
    });
    this._changeset = [];
    this.recording = _knockout2.default.observable();
    this._subscriptions = new _weakMap2.default();
    this._subscriptionsCount = 0;
    this._ignoreChanges = false;

    this.steps(steps);
    this.throttle(throttle);
    this.startListening(vm);
  }

  /**
   * A collection for all changes done within the {@see throttle} timeout.
   * This acts as a full rollback path.
   * @type {Array}
   */


  /**
   * Returns a boolean of whether there are undo-steps or not
   * @return {Boolean}   has undo steps
   */


  /**
   * Stack for future state snapshots
   * @type {Array}
   */

  /**
   * Determins how many undo/redo steps will be stored in memory.
   * @type {Number}
   */


  (0, _createClass3.default)(UndoManager, [{
    key: 'startListening',
    value: function startListening(vm) {
      var _this2 = this;

      if (this.isUndoable(vm)) {
        if (this._subscriptions.has(vm)) return;
        var observable = vm;
        var previousValue = observable.peek();

        if (Array.isArray(previousValue)) {
          previousValue = [].concat((0, _toConsumableArray3.default)(previousValue)); // clone

          var subscription = observable.subscribe(function (changes) {

            var offset = 0;
            var nextValue = changes.reduce(function (subject, change) {
              subject = [].concat((0, _toConsumableArray3.default)(subject));
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

            _this2.onChange({ observable: observable, nextValue: nextValue, previousValue: previousValue });
            previousValue = nextValue;
          }, null, 'arrayChange');

          this._subscriptions.set(vm, subscription);
          this._subscriptionsCount++;

          previousValue.forEach(function (item) {
            return _this2.startListening(item);
          });
        } else {
          var _subscription = observable.subscribe(function (nextValue) {
            _this2.onChange({ observable: observable, nextValue: nextValue, previousValue: previousValue });
            previousValue = nextValue;
          });
          this._subscriptions.set(vm, _subscription);
          this._subscriptionsCount++;
        }
      } else if ((typeof vm === 'undefined' ? 'undefined' : (0, _typeof3.default)(vm)) === 'object') {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = (0, _getIterator3.default)((0, _values2.default)(vm)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var item = _step.value;

            this.startListening(item);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    }
  }, {
    key: 'stopListening',
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

      if ((typeof vm === 'undefined' ? 'undefined' : (0, _typeof3.default)(vm)) === 'object') {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = (0, _getIterator3.default)((0, _values2.default)(vm)), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var item = _step2.value;

            this.stopListening(item);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }
    }
  }, {
    key: 'takeSnapshot',
    value: function takeSnapshot() {
      clearTimeout(this.recording());
      this.past.splice(0, this.past().length - this.steps());

      this.future([]);
      this._changeset = [];
      this.recording(null);
    }
  }, {
    key: 'onChange',
    value: function onChange(_ref2) {
      var _this3 = this;

      var observable = _ref2.observable,
          nextValue = _ref2.nextValue,
          previousValue = _ref2.previousValue;

      if (this._ignoreChanges) return;
      if (this.recording()) clearTimeout(this.recording()); // reset timeout
      else this.past.push(this._changeset); // push the changeset immediatelly

      var atomicChange = { observable: observable, nextValue: nextValue, previousValue: previousValue };
      this._changeset.push(atomicChange);

      if (this.throttle()) this.recording(setTimeout(function () {
        return _this3.takeSnapshot();
      }, this.throttle()));else this.takeSnapshot();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.past([]);
      this.future([]);
      // this._subscriptions.forEach((subscription) => subscription.dispose());
      // this._subscriptions = [];
    }
  }, {
    key: 'undo',
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
          var targetArray = [].concat((0, _toConsumableArray3.default)(observable.peek()));
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
    key: 'redo',
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
          var targetArray = [].concat((0, _toConsumableArray3.default)(observable.peek())); // clone

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
    key: 'isUndoable',
    value: function isUndoable(vm) {
      return _knockout2.default.isWritableObservable(vm) && _knockout2.default.isSubscribable(vm);
    }
  }]);
  return UndoManager;
}(), (_applyDecoratedDescriptor(_class.prototype, 'startListening', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'startListening'), _class.prototype), _applyDecoratedDescriptor(_class.prototype, 'stopListening', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'stopListening'), _class.prototype), _applyDecoratedDescriptor(_class.prototype, 'takeSnapshot', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'takeSnapshot'), _class.prototype), _applyDecoratedDescriptor(_class.prototype, 'destroy', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'destroy'), _class.prototype), _applyDecoratedDescriptor(_class.prototype, 'undo', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'undo'), _class.prototype), _applyDecoratedDescriptor(_class.prototype, 'redo', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'redo'), _class.prototype), _applyDecoratedDescriptor(_class.prototype, 'isUndoable', [_coreDecorators.autobind], (0, _getOwnPropertyDescriptor2.default)(_class.prototype, 'isUndoable'), _class.prototype)), _class);
exports.default = UndoManager;