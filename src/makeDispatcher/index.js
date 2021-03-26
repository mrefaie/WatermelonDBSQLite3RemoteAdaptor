'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.getDispatcherType = getDispatcherType;
exports.makeDispatcher = void 0;

var _toConsumableArray2 = _interopRequireDefault(
  require('@babel/runtime/helpers/toConsumableArray')
);

var _rambdax = require('rambdax');

var _DatabaseBridge = _interopRequireDefault(require('./node/DatabaseBridge'));

exports.DatabaseBridge = _DatabaseBridge.default;

var _common = require('@nozbe/watermelondb/utils/common');

var _Result = require('@nozbe/watermelondb/utils/fp/Result');

var _common2 = require('../common');

/* eslint-disable global-require */
var dispatcherMethods = [
  'initialize',
  'setUpWithSchema',
  'setUpWithMigrations',
  'find',
  'query',
  'count',
  'batch',
  'batchJSON',
  'getDeletedRecords',
  'destroyDeletedRecords',
  'unsafeResetDatabase',
  'getLocal',
  'setLocal',
  'removeLocal',
];

var makeDispatcher = function (type, tag) {
  var methods = dispatcherMethods.map(function (methodName) {
    var name =
      'synchronous' === type
        ? ''.concat(methodName, 'Synchronous')
        : methodName;
    return [
      methodName,
      function (...args) {
        // $FlowFixMe
        var callback = args[args.length - 1];
        var otherArgs = args.slice(0, -1);

        if ('synchronous' === type) {
          // $FlowFixMe
          callback(
            (0, _common2.syncReturnToResult)(
              _DatabaseBridge.default[name].apply(
                _DatabaseBridge.default,
                [tag].concat((0, _toConsumableArray2.default)(otherArgs))
              )
            )
          );
        } else {
          var promise = new Promise(function (resolve, reject) {
            // $FlowFixMe
            _DatabaseBridge.default[name].apply(
              _DatabaseBridge.default,
              [tag].concat((0, _toConsumableArray2.default)(otherArgs), [
                resolve,
                function (code, message, error) {
                  reject(error);
                },
              ])
            );
          });
          (0, _Result.fromPromise)(promise, callback);
        }
      },
    ];
  });
  var dispatcher = (0, _rambdax.fromPairs)(methods); // $FlowFixMe

  return dispatcher;
};

exports.makeDispatcher = makeDispatcher;

function getDispatcherType(options) {
  if (options.synchronous) {
    if (_DatabaseBridge.default.initializeSynchronous) {
      return 'synchronous';
    }

    _common.logger.warn(
      "Synchronous SQLiteAdapter not available\u2026 falling back to asynchronous operation. This will happen if you're using remote debugger, and may happen if you forgot to recompile native app after WatermelonDB update"
    );
  }

  return 'asynchronous';
}
