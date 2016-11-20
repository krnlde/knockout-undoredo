'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _entries = require('babel-runtime/core-js/object/entries');

var _entries2 = _interopRequireDefault(_entries);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var UndoManager = function () {

  /**
   * [throttle description]
   * @type {Number}
   */


  /**
   * Stack for past state snapshots
   * @type {Array}
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
    this.undoCollection = [];
    this._batchTimeout = null;
    this._ignoreChanges = false;

    this.MAX_UNDO_STEPS = steps;
    this.throttle = throttle;
    this.listen(vm);
  }

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


  (0, _createClass3.default)(UndoManager, [{
    key: 'listen',
    value: function listen(vm) {
      var _this = this;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)((0, _entries2.default)(vm)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = (0, _slicedToArray3.default)(_step.value, 2),
              key = _step$value[0],
              item = _step$value[1];

          if (_knockout2.default.isWritableObservable(item) && !_knockout2.default.isComputed(item) && _knockout2.default.isSubscribable(item)) {
            (function () {
              var observable = item;
              var previousValue = observable.peek();

              previousValue = Array.isArray(previousValue) ? [].concat((0, _toConsumableArray3.default)(previousValue)) : previousValue;

              observable.subscribe(function (nextValue) {
                nextValue = Array.isArray(nextValue) ? [].concat((0, _toConsumableArray3.default)(nextValue)) : nextValue;
                _this.change({ observable: observable, nextValue: nextValue, previousValue: previousValue });
                previousValue = nextValue;
              });

              if (Array.isArray(previousValue)) {
                previousValue.forEach(function (item) {
                  return _this.listen(item);
                });
              }
            })();
          }
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
  }, {
    key: 'change',
    value: function change(_ref2) {
      var _this2 = this;

      var observable = _ref2.observable,
          nextValue = _ref2.nextValue,
          previousValue = _ref2.previousValue;

      if (this._ignoreChanges) return;
      if (this._batchTimeout) clearTimeout(this._batchTimeout);

      var atomicChange = { observable: observable, nextValue: nextValue, previousValue: previousValue };
      this.undoCollection.push(atomicChange);

      var afterCollecting = function afterCollecting() {
        _this2.past.push(_this2.undoCollection);
        _this2.past = _this2.past.slice(-_this2.MAX_UNDO_STEPS);
        _this2.future = [];
        _this2.undoCollection = [];
        _this2._batchTimeout = null;
      };

      if (this.throttle) this._batchTimeout = setTimeout(afterCollecting, this.throttle);else afterCollecting();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      past = [];
      future = [];
    }
  }, {
    key: 'undo',
    value: function undo() {
      var _this3 = this;

      if (!this.past.length) return;
      if (this._batchTimeout) {
        clearTimeout(this._batchTimeout);
        this._batchTimeout = null;
      }
      var present = this.past.pop();
      this.future.push(present);

      this._ignoreChanges = true;
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
      setTimeout(function () {
        return _this3._ignoreChanges = false;
      });
      // console.log({past: this.past.length, future: this.future.length});
    }
  }, {
    key: 'redo',
    value: function redo() {
      var _this4 = this;

      if (!this.future.length) return;
      if (this._batchTimeout) {
        clearTimeout(this._batchTimeout);
        this._batchTimeout = null;
      }
      var present = this.future.pop();
      this.past.push(present);

      this._ignoreChanges = true;
      present.reverse().forEach(function (_ref4) {
        var observable = _ref4.observable,
            nextValue = _ref4.nextValue;

        if (Array.isArray(nextValue)) {
          (function () {
            var targetArray = [].concat((0, _toConsumableArray3.default)(observable.peek()));
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
      setTimeout(function () {
        return _this4._ignoreChanges = false;
      });
      // console.log({past: this.past.length, future: this.future.length});
    }
  }]);
  return UndoManager;
}();

exports.default = UndoManager;