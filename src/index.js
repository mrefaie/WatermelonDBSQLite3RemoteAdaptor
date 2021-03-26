'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.default = void 0;

var _extends2 = _interopRequireDefault(
  require('@babel/runtime/helpers/extends')
);

var _createClass2 = _interopRequireDefault(
  require('@babel/runtime/helpers/createClass')
);

var _common = require('@nozbe/watermelondb/utils/common');

var _Result = require('@nozbe/watermelondb/utils/fp/Result');

var _common2 = require('@nozbe/watermelondb/adapters/common');

var _encodeQuery = _interopRequireDefault(require('./encodeQuery'));

var _encodeUpdate = _interopRequireDefault(require('./encodeUpdate'));

var _encodeInsert = _interopRequireDefault(require('./encodeInsert'));

var _makeDispatcher = require('./makeDispatcher');

/* eslint-disable global-require */
// Hacky-ish way to create an object with NativeModule-like shape, but that can dispatch method
// calls to async, synch NativeModule, or JSI implementation w/ type safety in rest of the impl
var SQLiteAdapter =
  /*#__PURE__*/
  (function () {
    function SQLiteAdapter(options) {
      // this._tag = (0, _common.connectionTag)();
      // console.log(`---> Initializing new adapter (${this._tag})`)
      var {
        dbName: dbName,
        schema: schema,
        migrations: migrations,
        client: client,
        tcpConfig: tcpConfig,
        tag: tag,
      } = options;
      this._tag = tag ? tag : (0, _common.connectionTag)();
      this.schema = schema;
      this.migrations = migrations;
      this._dbName = this._getName(dbName);
      this._dispatcherType = (0, _makeDispatcher.getDispatcherType)(options);
      this._dispatcher = (0, _makeDispatcher.makeDispatcher)(
        this._dispatcherType,
        this._tag,
        this._dbName
      );

      this.client = tcpConfig;

      if ('production' !== process.env.NODE_ENV) {
        (0, _common.invariant)(
          !('migrationsExperimental' in options),
          'SQLiteAdapter `migrationsExperimental` option has been renamed to `migrations`'
        );

        if (options.synchronous) {
          // Docs semi-recommend synchronous: true, but it adds a lot of junk and I want to get rid
          // of this mode completely to simplify code. Ideally, we'd ONLY have JSI, but until RN goes
          // all-in on JSI everywhere, this might be a little too risky. I'm adding this warning to
          // get feedback via GH if JSI on iOS is ready to be considered stable or not yet.
          // _common.logger.warn(
          //   "SQLiteAdapter's synchronous:true option is deprecated and will be replaced with experimentalUseJSI: true in the future. Please test if your app compiles and works well with experimentalUseJSI: true, and if not - file an issue!"
          // );
        }

        (0, _common.invariant)(
          _makeDispatcher.DatabaseBridge,
          "NativeModules.DatabaseBridge is not defined! This means that you haven't properly linked WatermelonDB native module. Refer to docs for more details"
        );
        (0, _common2.validateAdapter)(this);
      }

      // if (!this.client || this.client.isServer) {
      this._initPromise = this._init();
      (0, _Result.fromPromise)(this._initPromise, function (result) {
        return (0, _common2.devSetupCallback)(result, options.onSetUpError);
      });
      // }
    }

    var _proto = SQLiteAdapter.prototype;

    _proto.testClone = function testClone(options = {}) {
      return new Promise(
        function ($return, $error) {
          var clone = new SQLiteAdapter(
            (0, _extends2.default)(
              {
                dbName: this._dbName,
                schema: this.schema,
                synchronous: 'synchronous' === this._dispatcherType,
                experimentalUseJSI: 'jsi' === this._dispatcherType,
              },
              this.migrations
                ? {
                    migrations: this.migrations,
                  }
                : {},
              {},
              options
            )
          );
          (0, _common.invariant)(
            clone._dispatcherType === this._dispatcherType,
            'testCloned adapter has bad dispatcher type'
          );
          return Promise.resolve(clone._initPromise).then(function () {
            try {
              return $return(clone);
            } catch ($boundEx) {
              return $error($boundEx);
            }
          }, $error);
        }.bind(this)
      );
    };

    _proto._getName = function _getName(name) {
      if ('test' === process.env.NODE_ENV) {
        return (
          name || 'file:testdb'.concat(this._tag, '?mode=memory&cache=shared')
        );
      }

      return name || 'watermelon';
    };

    _proto._init = function _init() {
      return new Promise(
        function ($return, $error) {
          var _this, status;

          _this = this;
          return Promise.resolve(
            (0, _Result.toPromise)(function (callback) {
              return _this._dispatcher.initialize(
                _this._dbName,
                _this.schema.version,
                _this.client,
                callback
              );
            })
          ).then(
            function ($await_6) {
              try {
                status = $await_6;

                // NOTE: Race condition - logic here is asynchronous, but synchronous-mode adapter does not allow
                // for queueing operations. will fail if you start making actions immediately
                if ('schema_needed' === status.code) {
                  return Promise.resolve(this._setUpWithSchema()).then(
                    function () {
                      try {
                        return $If_2.call(this);
                      } catch ($boundEx) {
                        return $error($boundEx);
                      }
                    }.bind(this),
                    $error
                  );
                } else {
                  if ('migrations_needed' === status.code) {
                    return Promise.resolve(
                      this._setUpWithMigrations(status.databaseVersion)
                    ).then(
                      function () {
                        try {
                          return $If_3.call(this);
                        } catch ($boundEx) {
                          return $error($boundEx);
                        }
                      }.bind(this),
                      $error
                    );
                  } else {
                    (0, _common.invariant)(
                      'ok' === status.code,
                      'Invalid database initialization status'
                    );
                    return $If_3.call(this);
                  }

                  function $If_3() {
                    return $If_2.call(this);
                  }
                } // console.log(`---> Done initializing (${this._tag})`)

                function $If_2() {
                  return $return();
                }
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }.bind(this),
            $error
          );
        }.bind(this)
      );
    };

    _proto._setUpWithMigrations = function _setUpWithMigrations(
      databaseVersion
    ) {
      return new Promise(
        function ($return, $error) {
          var _this2, migrationSteps;

          _this2 = this;

          _common.logger.log(
            '[WatermelonDB][SQLite] Database needs migrations'
          );

          (0, _common.invariant)(
            0 < databaseVersion,
            'Invalid database schema version'
          );
          migrationSteps = this._migrationSteps(databaseVersion);

          if (migrationSteps) {
            _common.logger.log(
              '[WatermelonDB][SQLite] Migrating from version '
                .concat(databaseVersion, ' to ')
                .concat(this.schema.version, '...')
            );

            var $Try_1_Post = function () {
              try {
                return $If_4.call(this);
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }.bind(this);

            var $Try_1_Catch = function (error) {
              try {
                _common.logger.error(
                  '[WatermelonDB][SQLite] Migration failed',
                  error
                );

                throw error;
              } catch ($boundEx) {
                return $error($boundEx);
              }
            };

            try {
              return Promise.resolve(
                (0, _Result.toPromise)(function (callback) {
                  return _this2._dispatcher.setUpWithMigrations(
                    _this2._dbName,
                    _this2._encodeMigrations(migrationSteps),
                    databaseVersion,
                    _this2.schema.version,
                    callback
                  );
                })
              ).then(function () {
                try {
                  _common.logger.log(
                    '[WatermelonDB][SQLite] Migration successful'
                  );

                  return $Try_1_Post();
                } catch ($boundEx) {
                  return $Try_1_Catch($boundEx);
                }
              }, $Try_1_Catch);
            } catch (error) {
              $Try_1_Catch(error);
            }
          } else {
            _common.logger.warn(
              '[WatermelonDB][SQLite] Migrations not available for this version range, resetting database instead'
            );

            return Promise.resolve(this._setUpWithSchema()).then(
              function () {
                try {
                  return $If_4.call(this);
                } catch ($boundEx) {
                  return $error($boundEx);
                }
              }.bind(this),
              $error
            );
          }

          function $If_4() {
            return $return();
          }
        }.bind(this)
      );
    };

    _proto._setUpWithSchema = function _setUpWithSchema() {
      return new Promise(
        function ($return, $error) {
          var _this3 = this;

          _common.logger.log(
            '[WatermelonDB][SQLite] Setting up database with schema version '.concat(
              this.schema.version
            )
          );

          return Promise.resolve(
            (0, _Result.toPromise)(function (callback) {
              return _this3._dispatcher.setUpWithSchema(
                _this3._dbName,
                _this3._encodedSchema(),
                _this3.schema.version,
                callback
              );
            })
          ).then(function () {
            try {
              _common.logger.log(
                '[WatermelonDB][SQLite] Schema set up successfully'
              );

              return $return();
            } catch ($boundEx) {
              return $error($boundEx);
            }
          }, $error);
        }.bind(this)
      );
    };

    _proto.find = function find(table, id, callback) {
      var _this4 = this;

      (0, _common2.validateTable)(table, this.schema);

      this._dispatcher.find(table, id, function (result) {
        return callback(
          (0, _Result.mapValue)(function (rawRecord) {
            return (0,
            _common2.sanitizeFindResult)(rawRecord, _this4.schema.tables[table]);
          }, result)
        );
      });
    };

    _proto.query = function query(_query, callback) {
      (0, _common2.validateTable)(_query.table, this.schema);
      this.unsafeSqlQuery(
        _query.table,
        (0, _encodeQuery.default)(_query),
        callback
      );
    };

    _proto.unsafeSqlQuery = function unsafeSqlQuery(table, sql, callback) {
      var _this5 = this;

      (0, _common2.validateTable)(table, this.schema);

      this._dispatcher.query(table, sql, function (result) {
        return callback(
          (0, _Result.mapValue)(function (rawRecords) {
            return (0,
            _common2.sanitizeQueryResult)(rawRecords, _this5.schema.tables[table]);
          }, result)
        );
      });
    };

    _proto.count = function count(query, callback) {
      (0, _common2.validateTable)(query.table, this.schema);
      var sql = (0, _encodeQuery.default)(query, true);

      this._dispatcher.count(sql, callback);
    };

    _proto.batch = function batch(operations, callback) {
      var _this6 = this;

      var batchOperations = operations.map(function (operation) {
        var [type, table, rawOrId] = operation;
        (0, _common2.validateTable)(table, _this6.schema);

        switch (type) {
          case 'create':
            // $FlowFixMe
            return ['create', table, rawOrId.id].concat(
              (0, _encodeInsert.default)(table, rawOrId)
            );

          case 'update':
            // $FlowFixMe
            return ['execute', table].concat(
              (0, _encodeUpdate.default)(table, rawOrId)
            );

          case 'markAsDeleted':
          case 'destroyPermanently':
            // $FlowFixMe
            return operation;
          // same format, no need to repack

          default:
            throw new Error('unknown batch operation type');
        }
      });
      var { batchJSON: batchJSON } = this._dispatcher;

      if (batchJSON) {
        batchJSON(JSON.stringify(batchOperations), callback);
      } else {
        this._dispatcher.batch(batchOperations, callback);
      }
    };

    _proto.getDeletedRecords = function getDeletedRecords(table, callback) {
      (0, _common2.validateTable)(table, this.schema);

      this._dispatcher.getDeletedRecords(table, callback);
    };

    _proto.destroyDeletedRecords = function destroyDeletedRecords(
      table,
      recordIds,
      callback
    ) {
      (0, _common2.validateTable)(table, this.schema);

      this._dispatcher.destroyDeletedRecords(table, recordIds, callback);
    };

    _proto.unsafeResetDatabase = function unsafeResetDatabase(callback) {
      this._dispatcher.unsafeResetDatabase(
        this._encodedSchema(),
        this.schema.version,
        function (result) {
          if (result.value) {
            _common.logger.log('[WatermelonDB][SQLite] Database is now reset');
          }

          callback(result);
        }
      );
    };

    _proto.getLocal = function getLocal(key, callback) {
      this._dispatcher.getLocal(key, callback);
    };

    _proto.setLocal = function setLocal(key, value, callback) {
      this._dispatcher.setLocal(key, value, callback);
    };

    _proto.removeLocal = function removeLocal(key, callback) {
      this._dispatcher.removeLocal(key, callback);
    };

    _proto.close = function close() {
      this._dispatcher.close();
    };

    _proto._encodedSchema = function _encodedSchema() {
      var { encodeSchema: encodeSchema } = require('./encodeSchema');

      return encodeSchema(this.schema);
    };

    _proto._migrationSteps = function _migrationSteps(fromVersion) {
      var {
        stepsForMigration: stepsForMigration,
      } = require('@nozbe/watermelondb/Schema/migrations/stepsForMigration');

      var { migrations: migrations } = this; // TODO: Remove this after migrations are shipped

      if (!migrations) {
        return null;
      }

      return stepsForMigration({
        migrations: migrations,
        fromVersion: fromVersion,
        toVersion: this.schema.version,
      });
    };

    _proto._encodeMigrations = function _encodeMigrations(steps) {
      var {
        encodeMigrationSteps: encodeMigrationSteps,
      } = require('./encodeSchema');

      return encodeMigrationSteps(steps);
    };

    (0, _createClass2.default)(SQLiteAdapter, [
      {
        key: 'initializingPromise',
        get: function get() {
          return this._initPromise;
        },
      },
    ]);
    return SQLiteAdapter;
  })();

exports.default = SQLiteAdapter;
