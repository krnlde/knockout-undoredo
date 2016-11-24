'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = function log() {};
// const log = console.log;

var UndoManager = function () {

  /**
   * A collection for all changes done within the {@see throttle} timeout.
   * This acts as a full rollback path.
   * @type {Array}
   */


  /**
   * Stack for future state snapshots
   * @type {Array}
   */

  /**
   * Determins how many undo/redo steps will be stored in memory.
   * @type {Number}
   */
  function UndoManager(vm) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$steps = _ref.steps,
        steps = _ref$steps === undefined ? 30 : _ref$steps,
        _ref$throttle = _ref.throttle,
        throttle = _ref$throttle === undefined ? 300 : _ref$throttle;

    (0, _classCallCheck3.default)(this, UndoManager);
    this.past = [];
    this.future = [];
    this.throttle = 300;
    this.changeset = [];
    this._subscriptions = [];
    this.recording = null;
    this._ignoreChanges = false;

    this.steps = steps;
    this.throttle = throttle;
    this.startListening(vm);
  }

  /**
   * [throttle description]
   * @type {Number}
   */


  /**
   * Stack for past state snapshots
   * @type {Array}
   */


  (0, _createClass3.default)(UndoManager, [{
    key: 'startListening',
    value: function startListening(vm) {
      var _this = this;

      if (this.isUndoable(vm)) {
        var _ret = function () {
          var observable = vm;
          var previousValue = observable.peek();

          if (Array.isArray(previousValue)) {
            previousValue = [].concat((0, _toConsumableArray3.default)(previousValue)); // clone

            var subscription = observable.subscribe(function (changes) {
              var nextValue = changes.reduce(function (subject, change) {
                log('- Array Event:', change.status);
                switch (change.status) {
                  case 'added':
                    _this.startListening(change.value);
                    log('Start listening to', _knockout2.default.unwrap(change.value).toString(), _this._subscriptions.length, 'listeners');
                    subject = [].concat((0, _toConsumableArray3.default)(subject));
                    subject.splice(change.index, 0, change.value);
                    return subject;
                  case 'deleted':
                    _this.stopListening(change.value);
                    log('Stop listening to', _knockout2.default.unwrap(change.value).toString(), _this._subscriptions.length, 'listeners');
                    subject = [].concat((0, _toConsumableArray3.default)(subject));
                    subject.splice(change.index, 1);
                    return subject;
                  default:
                    return [].concat((0, _toConsumableArray3.default)(subject));
                }
              }, [].concat((0, _toConsumableArray3.default)(previousValue)));

              _this.onChange({ observable: observable, nextValue: nextValue, previousValue: previousValue });
              previousValue = [].concat((0, _toConsumableArray3.default)(nextValue));
            }, null, 'arrayChange');

            _this._subscriptions.push(subscription);
            // log('Added [array]', this._subscriptions.length, 'listeners')

            _this.startListening(previousValue);
          } else {
            var _subscription = observable.subscribe(function (nextValue) {
              _this.onChange({ observable: observable, nextValue: nextValue, previousValue: previousValue });
              previousValue = nextValue;
            });
            _this._subscriptions.push(_subscription);
            // log('Added', observable.peek(), this._subscriptions.length, 'listeners');
          }
          return {
            v: void 0
          };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3.default)(_ret)) === "object") return _ret.v;
      }

      if ((typeof vm === 'undefined' ? 'undefined' : (0, _typeof3.default)(vm)) === 'object') {
        var items = (0, _values2.default)(vm);

        if (items.length) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = (0, _getIterator3.default)(items), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
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

          return;
        }
      }
    }
  }, {
    key: 'stopListening',
    value: function stopListening(vm) {
      var _this2 = this;

      if (this.isUndoable(vm)) {
        var _ret2 = function () {
          var observable = vm;
          var previousValue = observable.peek();

          _this2._subscriptions = _this2._subscriptions.reduce(function (reduced, subscription) {
            if (subscription._target === observable) {
              subscription.dispose();
            } else {
              reduced.push(subscription);
            }
            return reduced;
          }, []);

          if (Array.isArray(previousValue)) {
            _this2.stopListening(previousValue);
          }
          return {
            v: void 0
          };
        }();

        if ((typeof _ret2 === 'undefined' ? 'undefined' : (0, _typeof3.default)(_ret2)) === "object") return _ret2.v;
      }

      if ((typeof vm === 'undefined' ? 'undefined' : (0, _typeof3.default)(vm)) === 'object') {
        var items = (0, _values2.default)(vm);

        if (items.length) {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = (0, _getIterator3.default)(items), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
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

          return;
        }
      }
    }
  }, {
    key: 'takeSnapshot',
    value: function takeSnapshot() {
      clearTimeout(this.recording);
      this.past = this.past.slice(-this.steps);
      this.future = [];
      this.changeset = [];
      this.recording = null;
      log('BEGIN NEW CHANGESET');
      log(this.past.length, 'items in history');
    }
  }, {
    key: 'onChange',
    value: function onChange(_ref2) {
      var _this3 = this;

      var observable = _ref2.observable,
          nextValue = _ref2.nextValue,
          previousValue = _ref2.previousValue;

      if (this._ignoreChanges) return;
      log('CHANGE REGISTERED');
      if (this.recording) clearTimeout(this.recording); // reset timeout
      else this.past.push(this.changeset); // push the changeset immediatelly

      var atomicChange = { observable: observable, nextValue: nextValue, previousValue: previousValue };
      this.changeset.push(atomicChange);

      if (this.throttle) this.recording = setTimeout(function () {
        return _this3.takeSnapshot();
      }, this.throttle);else this.takeSnapshot();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.past = [];
      this.future = [];
      this._subscriptions.forEach(function (subscription) {
        return subscription.dispose();
      });
      this._subscriptions = [];
    }
  }, {
    key: 'undo',
    value: function undo() {
      if (!this.past.length) return;
      if (this.recording) {
        clearTimeout(this.recording);
        this.recording = null;
      }
      var present = this.past.pop();
      this.future.push(present);

      this._ignoreChanges = true;

      log(present.length, 'steps');
      present.reverse().forEach(function (_ref3) {
        var observable = _ref3.observable,
            previousValue = _ref3.previousValue;

        if (Array.isArray(previousValue)) {
          (function () {
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
          })();
        } else {
          observable(previousValue);
        }
      });

      this._ignoreChanges = false;
    }
  }, {
    key: 'redo',
    value: function redo() {
      if (!this.future.length) return;
      if (this.recording) {
        clearTimeout(this.recording);
        this.recording = null;
      }
      var present = this.future.pop();
      this.past.push(present);

      this._ignoreChanges = true;

      log('Changeset contains steps:', present.length);
      present.reverse().forEach(function (_ref4) {
        var observable = _ref4.observable,
            nextValue = _ref4.nextValue;

        if (Array.isArray(nextValue)) {
          (function () {
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
          })();
        } else {
          observable(nextValue);
        }
      });

      this._ignoreChanges = false;
    }
  }, {
    key: 'isUndoable',
    value: function isUndoable(vm) {
      return _knockout2.default.isWritableObservable(vm) && !_knockout2.default.isComputed(vm) && _knockout2.default.isSubscribable(vm);
    }
  }]);
  return UndoManager;
}();

exports.default = UndoManager;