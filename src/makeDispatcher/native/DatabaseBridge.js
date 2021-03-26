'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.default = void 0;

var _reactNative = require('react-native');

var TcpSocket = require('react-native-tcp-socket').default;

var uuid = require('react-native-uuid');

var { DatabaseBridge: DatabaseBridgeNative } = _reactNative.NativeModules;

var DatabaseBridgeObj = (function () {
  function DatabaseBridge() {
    // var _this = this;
    this.client = undefined;
    this.server = undefined;
    this.received = [];
  }

  DatabaseBridge.prototype.initialize = function (
    tag,
    databaseName,
    schemaVersion,
    client
  ) {
    console.info('WMDB: Initialize', client);
    console.log('Client', this.client);
    console.log('Server', this.server);
    var _this = this;
    if (client.isServer === true) {
      if (_this.server === undefined) {
        console.log('Creating Server');
        _this.server = TcpSocket.createServer(function (socket) {
          socket.on('data', async (data) => {
            // console.log(data);
            var d = data
              .toString()
              .split('EOM\n')
              .filter((d) => d.length !== 0);
            for (var i = 0; i < d.length; i++) {
              try {
                var cmd = JSON.parse(d[i]);
                console.log('Server received cmd', cmd);
                var res = await _this[cmd['func']](...cmd['args']);
                console.log(res);
                socket.write(
                  JSON.stringify({
                    id: cmd.id,
                    res,
                  }) + 'EOM\n'
                );
              } catch (e) {
                console.error('Server Error: Parsing and Exec CMD', e);
              }
            }
          });

          socket.on('error', (error) => {
            console.error('An error ocurred with server socket ', error);
          });

          socket.on('close', (error) => {
            console.log('Server closed connection with ', socket.address());
          });
        }).listen({ port: client.port, host: '0.0.0.0' });

        this.server.on('error', (error) => {
          console.error('An error ocurred with the server', error);
        });

        this.server.on('connection', (d) => {
          console.log('Server New Connection', d);
        });

        this.server.on('listening', (d) => {
          console.log('Server Listening', d);
        });

        this.server.on('close', () => {
          console.log('Server closed connection');
        });
      }
    } else if (client) {
      // var _this = this;
      if (_this.client === undefined) {
        try {
          _this.client = TcpSocket.createConnection(
            { port: client.port, host: '127.0.0.1', tls: false },
            () => {
              // No Action
            }
          );

          _this.client.on('error', function (error) {
            console.log('Client Socket Error', error);
          });

          _this.client.on('close', function () {
            console.log('Client Connection closed!');
          });

          _this.client.on('data', function (data) {
            var d = data
              .toString()
              .split('EOM\n')
              .filter((d) => d.length !== 0);
            for (var i = 0; i < d.length; i++) {
              try {
                var d = JSON.parse(d[i]);
                d.id && _this.received.push(d);
              } catch (e) {}
            }
          });
        } catch (e) {
          console.log('Client Socket Error', e);
        }
      }
      var p = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve({ code: 'ok' });
        }, 300);
      });
      // setTimeout(() => p.resolve({ code: 'ok' }), 1000);
      // p.resolve({ code: 'ok' });
      return p;
    }
    return DatabaseBridgeNative.initialize(tag, databaseName, schemaVersion);
  };

  DatabaseBridge.prototype.setUpWithSchema = function (
    tag,
    databaseName,
    schema,
    schemaVersion
  ) {
    console.log('WMDB: setUpWithSchema');

    if (this.client) {
      var p = new Promise();
      setTimeout(() => p.resolve({ code: 'ok' }), 100);
      // p.resolve({ code: 'ok' });
      return p;
    } else {
      return DatabaseBridgeNative.setUpWithSchema(
        tag,
        databaseName,
        schema,
        schemaVersion
      );
    }
  };

  DatabaseBridge.prototype.setUpWithMigrations = function (
    tag,
    databaseName,
    migrations,
    fromVersion,
    toVersion
  ) {
    console.log('WMDB: setUpWithMigrations');

    if (this.client) {
      var p = new Promise();
      setTimeout(() => p.resolve({ code: 'ok' }), 100);
      // p.resolve({ code: 'ok' });
      return p;
    } else {
      return DatabaseBridgeNative.setUpWithMigrations(
        tag,
        databaseName,
        migrations,
        fromVersion,
        toVersion
      );
    }
  };
  DatabaseBridge.prototype.find = function (tag, table, id) {
    console.log('WMDB: find');

    if (this.client) {
      this.client.write(
        JSON.stringify({
          id: uuid.v4(),
          func: 'find',
          args: [tag, table, id],
        }) + 'EOM\n'
      );
      return new Promise();
    } else {
      return DatabaseBridgeNative.find(tag, table, id);
    }
  };

  DatabaseBridge.prototype.query = function (tag, table, query) {
    var _this = this;
    console.log('WMDB: query', _this.client ? 'Client' : 'Server');

    if (_this.client !== undefined) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'query',
            args: [tag, table, query],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.query(tag, table, query);
    }
  };

  DatabaseBridge.prototype.count = function (tag, query) {
    var _this = this;
    console.log('WMDB: count', _this.client ? 'Client' : 'Server');

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'count',
            args: [tag, query],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.count(tag, query);
    }
  };

  DatabaseBridge.prototype.batch = function (tag, operations) {
    var _this = this;
    console.log('WMDB: batch', _this.client ? 'Client' : 'Server');

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'batch',
            args: [tag, operations],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.batch(tag, operations);
    }
  };

  DatabaseBridge.prototype.getDeletedRecords = function (tag, table) {
    var _this = this;
    console.log('WMDB: getDeletedRecords', _this.client ? 'Client' : 'Server');

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'getDeletedRecords',
            args: [tag, table],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.getDeletedRecords(tag, table);
    }
  };

  DatabaseBridge.prototype.destroyDeletedRecords = function (
    tag,
    table,
    records
  ) {
    var _this = this;
    console.log(
      'WMDB: destroyDeletedRecords',
      _this.client ? 'Client' : 'Server'
    );

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'destroyDeletedRecords',
            args: [tag, table, records],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.destroyDeletedRecords(tag, table, records);
    }
  };

  DatabaseBridge.prototype.unsafeResetDatabase = function (
    tag,
    schema,
    schemaVersion
  ) {
    console.log('WMDB: unsafeResetDatabase');

    if (this.client) {
      var p = new Promise((resolve, reject) => {
        resolve();
      });

      return p;
    } else {
      return DatabaseBridgeNative.unsafeResetDatabase(
        tag,
        schema,
        schemaVersion
      );
    }
  };

  DatabaseBridge.prototype.getLocal = function (tag, key) {
    var _this = this;
    console.log('WMDB: getLocal', _this.client ? 'Client' : 'Server');

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'getLocal',
            args: [tag, tkey],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.getLocal(tag, key);
    }
  };
  DatabaseBridge.prototype.setLocal = function (tag, key, value) {
    var _this = this;
    console.log('WMDB: setLocal', _this.client ? 'Client' : 'Server');

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'setLocal',
            args: [tag, key, value],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.setLocal(tag, key, value);
    }
  };

  DatabaseBridge.prototype.removeLocal = function (tag, key) {
    var _this = this;
    console.log('WMDB: removeLocal', _this.client ? 'Client' : 'Server');

    if (_this.client) {
      var p;
      try {
        var id = uuid.v4();
        _this.client.write(
          JSON.stringify({
            id,
            func: 'removeLocal',
            args: [tag, key],
          }) + 'EOM\n'
        );
        p = new Promise((resolve, reject) => {
          var x = setInterval(() => {
            var y = _this.received.find((d) => d.id === id);
            if (y) {
              clearInterval(x);
              console.log(y);
              resolve(y.res);
            }
          }, 100);
        });
      } catch (e) {
        console.log('Client query error', e);
      }

      return p;
    } else {
      return DatabaseBridgeNative.removeLocal(tag, key);
    }
  };

  DatabaseBridge.prototype.close = function () {
    try {
      this.server.close();
      this.server = undefined;
    } catch (e) {}
    try {
      this.client.destroy();
      this.client = undefined;
    } catch (e) {}
  };

  return DatabaseBridge;
})();

exports.DatabaseBridge = DatabaseBridgeObj;
