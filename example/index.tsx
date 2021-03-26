import * as React from 'react';

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './src/model/schema';

import Post from './src/model/Post';
import Comment from './src/model/Comment';

import withObservables from '@nozbe/with-observables';

import WatermelondbSqlite3Adapter from 'watermelondb-sqlite3-adapter';

import { NetworkInfo } from 'react-native-network-info';

import TcpSocket from 'react-native-tcp-socket';

import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';

const adapter = new WatermelondbSqlite3Adapter({
  schema,
  synchronous: false,
  tcpConfig: {
    isServer: true,
    port: 65001,
    secret: '#$123',
  },
});

const database = new Database({
  adapter,
  modelClasses: [Post, Comment],
  actionsEnabled: true,
});

const radapter = new WatermelondbSqlite3Adapter({
  schema,
  synchronous: false,
  tcpConfig: {
    isServer: false,
    port: 65001,
    secret: '#$123',
  },
  tag: adapter._tag,
});
const rdatabase = new Database({
  adapter: radapter,
  modelClasses: [Post, Comment],
  actionsEnabled: true,
});

AppRegistry.registerComponent(appName, () => () => (
  //   <DatabaseProvider >
  <App rdatabase={rdatabase} database={database} />
  //   </DatabaseProvider>
));
