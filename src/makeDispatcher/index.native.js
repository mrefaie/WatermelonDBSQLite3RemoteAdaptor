'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.getDispatcherType = getDispatcherType;
exports.makeDispatcher = exports.DatabaseBridgeInstance = void 0;

var _toConsumableArray2 = _interopRequireDefault(
  require('@babel/runtime/helpers/toConsumableArray')
);

var _reactNative = require('react-native');

var _rambdax = require('rambdax');

var _common = require('@nozbe/watermelondb/utils/common');

var _Result = require('@nozbe/watermelondb/utils/fp/Result');

var _common2 = require('../common');

/* eslint-disable global-require */
var { DatabaseBridge } = require('./native/DatabaseBridge');
var DatabaseBridgeInstance = undefined;
// console.log(DatabaseBridgeInstance);

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
  'close',
];

var makeDispatcher = function (type, tag, dbName) {
  DatabaseBridgeInstance = new DatabaseBridge();
  var jsiDb = 'jsi' === type && global.nativeWatermelonCreateAdapter(dbName);
  var methods = dispatcherMethods.map(function (methodName) {
    // batchJSON is missing on Android
    if (
      !DatabaseBridgeInstance[methodName] ||
      ('batchJSON' === methodName && jsiDb)
    ) {
      return [methodName, undefined];
    }

    var name =
      'synchronous' === type
        ? ''.concat(methodName, 'Synchronous')
        : methodName;
    return [
      methodName,
      function (...args) {
        var callback = args[args.length - 1];
        var otherArgs = args.slice(0, -1);

        if (jsiDb) {
          try {
            var value =
              'query' === methodName || 'count' === methodName
                ? jsiDb[methodName].apply(
                    jsiDb,
                    (0, _toConsumableArray2.default)(otherArgs).concat([[]])
                  ) // FIXME: temp workaround
                : jsiDb[methodName].apply(
                    jsiDb,
                    (0, _toConsumableArray2.default)(otherArgs)
                  );
            callback({
              value: value,
            });
          } catch (error) {
            callback({
              error: error,
            });
          }

          return;
        } // $FlowFixMe

        var returnValue = DatabaseBridgeInstance[name].apply(
          DatabaseBridgeInstance,
          [tag].concat((0, _toConsumableArray2.default)(otherArgs))
        );

        if ('synchronous' === type) {
          // console.log('From Sync');
          callback((0, _common2.syncReturnToResult)(returnValue));
        } else {
          // console.log('From Promise');
          (0, _Result.fromPromise)(returnValue, callback);
        }
      },
    ];
  });
  var dispatcher = (0, _rambdax.fromPairs)(methods);
  return dispatcher;
};

exports.makeDispatcher = makeDispatcher;

var initializeJSI = function () {
  if (global.nativeWatermelonCreateAdapter) {
    return true;
  }

  if (DatabaseBridgeInstance.initializeJSI) {
    try {
      DatabaseBridgeInstance.initializeJSI();
      return !!global.nativeWatermelonCreateAdapter;
    } catch (e) {
      _common.logger.error('[WatermelonDB][SQLite] Failed to initialize JSI');

      _common.logger.error(e);
    }
  }

  return false;
};

function getDispatcherType(options) {
  (0, _common.invariant)(
    !(options.synchronous && options.experimentalUseJSI),
    '`synchronous` and `experimentalUseJSI` SQLiteAdapter options are mutually exclusive'
  );

  if (options.synchronous) {
    if (DatabaseBridgeInstance.initializeSynchronous) {
      return 'synchronous';
    }

    _common.logger.warn(
      "Synchronous SQLiteAdapter not available\u2026 falling back to asynchronous operation. This will happen if you're using remote debugger, and may happen if you forgot to recompile native app after WatermelonDB update"
    );
  } else if (options.experimentalUseJSI) {
    if (initializeJSI()) {
      return 'jsi';
    }

    _common.logger.warn(
      "JSI SQLiteAdapter not available\u2026 falling back to asynchronous operation. This will happen if you're using remote debugger, and may happen if you forgot to recompile native app after WatermelonDB update"
    );
  }

  return 'asynchronous';
}

exports.DatabaseBridge = DatabaseBridge;
