'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.getPath = getPath;
exports.default = void 0;

var _inheritsLoose2 = _interopRequireDefault(
  require('@babel/runtime/helpers/inheritsLoose')
);

var _wrapNativeSuper2 = _interopRequireDefault(
  require('@babel/runtime/helpers/wrapNativeSuper')
);

var _Database = _interopRequireDefault(require('./Database'));
var _DatabaseServer = _interopRequireDefault(require('./DatabaseServer'));

import TcpSocket from 'react-native-tcp-socket';

function fixArgs(args) {
  return Object.keys(args).reduce(function (acc, argName) {
    if ('boolean' === typeof acc[argName]) {
      acc[argName] = acc[argName] ? 1 : 0;
    }

    return acc;
  }, args);
}

var MigrationNeededError =
  /*#__PURE__*/
  (function (_Error) {
    (0, _inheritsLoose2.default)(MigrationNeededError, _Error);

    function MigrationNeededError(databaseVersion) {
      var _this = _Error.call(this, 'MigrationNeededError') || this;

      _this.databaseVersion = databaseVersion;
      _this.type = 'MigrationNeededError';
      _this.message = 'MigrationNeededError';
      return _this;
    }

    return MigrationNeededError;
  })((0, _wrapNativeSuper2.default)(Error));

var SchemaNeededError =
  /*#__PURE__*/
  (function (_Error2) {
    (0, _inheritsLoose2.default)(SchemaNeededError, _Error2);

    function SchemaNeededError() {
      var _this2 = _Error2.call(this, 'SchemaNeededError') || this;

      _this2.type = 'SchemaNeededError';
      _this2.message = 'SchemaNeededError';
      return _this2;
    }

    return SchemaNeededError;
  })((0, _wrapNativeSuper2.default)(Error));

function getPath(dbName) {
  if (':memory:' === dbName || 'file::memory:' === dbName) {
    return dbName;
  }

  var path =
    dbName.startsWith('/') || dbName.startsWith('file:')
      ? dbName
      : ''.concat(process.cwd(), '/').concat(dbName);

  if (-1 === path.indexOf('.db')) {
    if (0 <= path.indexOf('?')) {
      var index = path.indexOf('?');
      path = ''
        .concat(path.substring(0, index), '.db')
        .concat(path.substring(index));
    } else {
      path = ''.concat(path, '.db');
    }
  }

  return path;
}

var DatabaseDriver = function DatabaseDriver() {
  var _this3 = this;

  this.cachedRecords = {};

  this.initialize = function (dbName, schemaVersion, client) {
    _this3.init(dbName, client);

    _this3.isCompatible(schemaVersion);
  };

  this.setUpWithSchema = function (dbName, schema, schemaVersion) {
    _this3.init(dbName);

    _this3.unsafeResetDatabase({
      version: schemaVersion,
      sql: schema,
    });

    _this3.isCompatible(schemaVersion);
  };

  this.setUpWithMigrations = function (dbName, migrations) {
    _this3.init(dbName);

    _this3.migrate(migrations);

    _this3.isCompatible(migrations.to);
  };

  this.init = function (dbName, client) {
    if (client) {
      _this3.database = new _DatabaseServer.default(getPath(dbName));
    } else {
      _this3.database = new _Database.default(getPath(dbName));
    }

    this.TCPServer = TcpSocket.createServer(function (socket) {
      socket.on('data', (data) => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        if (parsed && parsed.member) {
          socket.write(
            JSON.stringify({
              id: parsed.id,
              data:
                typeof _this3.database[parsed.member] === 'function'
                  ? _this3.database[parsed.function](...parsed.args)
                  : _this3.database[parsed.member],
            })
          );
        }
      });

      socket.on('error', (error) => {
        console.log('Server', 'An error ocurred with client socket ', error);
      });

      socket.on('close', (error) => {
        console.log('Closed connection with ', socket.address());
      });
    }).listen({ port: 111, host: '0.0.0.0' });

    this.TCPServer.on('error', (error) => {
      console.log('Server', 'An error ocurred with the server', error);
    });

    this.TCPServer.on('close', () => {
      console.log('Server', 'Server closed connection');
    });

    var isSharedMemory =
      0 < dbName.indexOf('mode=memory') && 0 < dbName.indexOf('cache=shared');

    if (isSharedMemory) {
      if (!DatabaseDriver.sharedMemoryConnections[dbName]) {
        DatabaseDriver.sharedMemoryConnections[dbName] = _this3.database;
      }

      _this3.database = DatabaseDriver.sharedMemoryConnections[dbName];
    }
  };

  this.find = function (table, id) {
    if (_this3.isCached(table, id)) {
      return id;
    }

    var query = "SELECT * FROM '".concat(table, "' WHERE id == ? LIMIT 1");

    var results = _this3.database.queryRaw(query, [id]);

    if (0 === results.length) {
      return null;
    }

    _this3.markAsCached(table, id);

    return results[0];
  };

  this.cachedQuery = function (table, query) {
    var results = _this3.database.queryRaw(query);

    return results.map(function (row) {
      var id = ''.concat(row.id);

      if (_this3.isCached(table, id)) {
        return id;
      }

      _this3.markAsCached(table, id);

      return row;
    });
  };

  this.query = function (table, query) {
    return _this3.cachedQuery(table, query);
  };

  this.count = function (query) {
    return _this3.database.count(query);
  };

  this.batch = function (operations) {
    var newIds = [];
    var removedIds = [];

    _this3.database.inTransaction(function () {
      operations.forEach(function (operation) {
        var [type, table, ...rest] = operation;

        switch (type) {
          case 'execute': {
            var [_query, args] = rest;

            _this3.database.execute(_query, fixArgs(args));

            break;
          }

          case 'create': {
            var [_id, _query2, _args] = rest;

            _this3.database.execute(_query2, fixArgs(_args));

            newIds.push([table, _id]);
            break;
          }

          case 'markAsDeleted': {
            var [_id2] = rest;

            var _query3 = "UPDATE '".concat(
              table,
              "' SET _status='deleted' WHERE id == ?"
            );

            _this3.database.execute(_query3, [_id2]);

            removedIds.push([table, _id2]);
            break;
          }

          case 'destroyPermanently': {
            var [_id3] = rest; // TODO: What's the behavior if nothing got deleted?

            _this3.database.execute(
              "DELETE FROM '".concat(table, "' WHERE id == ?"),
              [_id3]
            );

            removedIds.push([table, _id3]);
            break;
          }

          default: {
            throw new Error('unreachable');
          }
        }
      });
    });

    newIds.forEach(function ([table, id]) {
      _this3.markAsCached(table, id);
    });
    removedIds.forEach(function ([table, id]) {
      _this3.removeFromCache(table, id);
    });
  };

  this.getDeletedRecords = function (table) {
    return _this3.database
      .queryRaw("SELECT ID FROM '".concat(table, "' WHERE _status='deleted'"))
      .map(function (row) {
        return ''.concat(row.id);
      });
  };

  this.destroyDeletedRecords = function (table, records) {
    var recordPlaceholders = records
      .map(function () {
        return '?';
      })
      .join(',');

    _this3.database.execute(
      "DELETE FROM '"
        .concat(table, "' WHERE id IN (")
        .concat(recordPlaceholders, ')'),
      records
    );
  };

  this.getLocal = function (key) {
    var results = _this3.database.queryRaw(
      'SELECT `value` FROM `local_storage` WHERE `key` = ?',
      [key]
    );

    if (0 < results.length) {
      return results[0].value;
    }

    return null;
  };

  this.setLocal = function (key, value) {
    _this3.database.execute(
      'INSERT OR REPLACE INTO `local_storage` (key, value) VALUES (?, ?)',
      [key, ''.concat(value)]
    );
  };

  this.removeLocal = function (key) {
    _this3.database.execute('DELETE FROM `local_storage` WHERE `key` == ?', [
      key,
    ]);
  };

  this.hasCachedTable = function (table) {
    return Object.prototype.hasOwnProperty.call(_this3.cachedRecords, table);
  };

  this.isCached = function (table, id) {
    if (_this3.hasCachedTable(table)) {
      return _this3.cachedRecords[table].has(id);
    }

    return false;
  };

  this.markAsCached = function (table, id) {
    if (!_this3.hasCachedTable(table)) {
      _this3.cachedRecords[table] = new Set();
    }

    _this3.cachedRecords[table].add(id);
  };

  this.removeFromCache = function (table, id) {
    if (_this3.hasCachedTable(table) && _this3.cachedRecords[table].has(id)) {
      _this3.cachedRecords[table].delete(id);
    }
  };

  this.isCompatible = function (schemaVersion) {
    var databaseVersion = _this3.database.userVersion;

    if (schemaVersion !== databaseVersion) {
      if (0 < databaseVersion && databaseVersion < schemaVersion) {
        throw new MigrationNeededError(databaseVersion);
      } else {
        throw new SchemaNeededError();
      }
    }
  };

  this.unsafeResetDatabase = function (schema) {
    _this3.database.unsafeDestroyEverything();

    _this3.cachedRecords = {};

    _this3.setUpSchema(schema);
  };

  this.setUpSchema = function (schema) {
    _this3.database.inTransaction(function () {
      _this3.database.executeStatements(schema.sql + _this3.localStorageSchema);

      _this3.database.userVersion = schema.version;
    });
  };

  this.migrate = function (migrations) {
    var databaseVersion = _this3.database.userVersion;

    if (''.concat(migrations.from) !== ''.concat(databaseVersion)) {
      throw new Error(
        'Incompatbile migration set applied. DB: '
          .concat(databaseVersion, ', migration: ')
          .concat(migrations.from)
      );
    }

    _this3.database.inTransaction(function () {
      _this3.database.executeStatements(migrations.sql);

      _this3.database.userVersion = migrations.to;
    });
  };

  this.localStorageSchema =
    '\n      create table local_storage (\n      key varchar(16) primary key not null,\n      value text not null\n      );\n\n      create index local_storage_key_index on local_storage (key);\n      ';
};

DatabaseDriver.sharedMemoryConnections = {};
var _default = DatabaseDriver;
exports.default = _default;
