'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.default = void 0;

var _createClass2 = _interopRequireDefault(
  require('@babel/runtime/helpers/createClass')
);

import { v4 as uuidv4 } from 'uuid';

var fs = require('fs');

import TcpSocket from 'react-native-tcp-socket';

var SQliteDatabase = require('better-sqlite3');

let responses = {};

var Database =
  /*#__PURE__*/
  (function () {
    function Database(_path = ':memory:') {
      const client = TcpSocket.createConnection(
        {
          port: 111,
          host: '10.0.2.15',
        },
        () => {
          var _this = this;

          this.instance = undefined;

          client.on('data', function (data) {
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch (e) {}
            if (parsed && parsed.id) {
              responses[parsed.id] = parsed.data;
            }
          });

          this.getSocketResponse = function (id) {
            const start = Date.now();
            while (!responses[id] && Date.now() - start < 300);
            const r = responses[id];
            delete responses[id];
            return r;
          };

          this.open = function () {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'open',
                args: [],
              })
            );
            return this.getSocketResponse(id);
          };

          this.inTransaction = function (executeBlock) {
            executeBlock();
          };

          this.execute = function (query, args = []) {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'execute',
                args: [query, args],
              })
            );
            return this.getSocketResponse(id);
          };

          this.executeStatements = function (queries) {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'executeStatements',
                args: [queries],
              })
            );
            return this.getSocketResponse(id);
          };

          this.queryRaw = function (query, args = []) {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'queryRaw',
                args: [query, args],
              })
            );
            return this.getSocketResponse(id);
          };

          this.count = function (query, args = []) {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'count',
                args: [query, args],
              })
            );
            return this.getSocketResponse(id);
          };

          this.getUserVersion = function () {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'getUserVersion',
                args: [],
              })
            );
            return this.getSocketResponse(id);
          };

          this.unsafeDestroyEverything = function () {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'unsafeDestroyEverything',
                args: [],
              })
            );
            return this.getSocketResponse(id);
          };

          this.isInMemoryDatabase = function () {
            const id = uuidv4();
            client.write(
              JSON.stringify({
                id: id,
                member: 'isInMemoryDatabase',
                args: [],
              })
            );
            return this.getSocketResponse(id);
          };

          this.path = _path; // this.instance = new SQliteDatabase(path);

          this.open();
        }
      );
    }

    (0, _createClass2.default)(Database, [
      {
        key: 'userVersion',
        get: function get() {
          return this.getUserVersion();
        },
        set: function set(version) {
          this.instance.pragma('user_version = '.concat(version));
          return this.getUserVersion();
        },
      },
    ]);
    return Database;
  })();

var _default = Database;
exports.default = _default;
