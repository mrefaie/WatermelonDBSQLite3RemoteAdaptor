import * as React from 'react';

import { StyleSheet, View, Text } from 'react-native';

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './model/schema';

import Post from './model/Post';
import Comment from './model/Comment';

import withObservables from '@nozbe/with-observables';

import WatermelondbSqlite3Adapter from 'watermelondb-sqlite3-adapter';

import { NetworkInfo } from 'react-native-network-info';

import TcpSocket from 'react-native-tcp-socket';

// const CommentCom = ({ comment }) => (
//   <View>
//     <Text>{comment.body}</Text>
//   </View>
// );

// let enhance = withObservables(['comment'], ({ comment }) => ({
//   comment,
//   // author: comment.author, // shortcut syntax for `comment.author.observe()`
// }));
// const EnhancedComment = enhance(CommentCom);

// const PostCom = ({ post, comments }) => (
//   <View>
//     <Text>{post.title}</Text>
//     <Text>{post.body}</Text>
//     <Text>Comments</Text>
//     {comments.map((comment) => (
//       <EnhancedComment key={comment.id} comment={comment} />
//     ))}
//   </View>
// );

// enhance = withObservables(['post'], ({ post }) => ({
//   post,
//   comments: post.comments, // Shortcut syntax for `post.comments.observe()`
// }));

// const EnhancedPost = enhance(PostCom);

NetworkInfo.getIPAddress().then((ipAddress) => {
  console.log(ipAddress);
});

export default function App({ rdatabase, database }) {
  // await rdatabase.action(async () => {
  //   const allPostsx = await postsCollection.query().fetch();
  //   console.log('allPosts', allPostsx);
  //   // allPostsx.forEach(async (p) => await p.destroyPermanently());
  //   // const newPost = await postsCollection.create((post) => {
  //   //   post.title = 'New post';
  //   //   post.body = 'Lorem ipsum...';
  //   //   post.is_pinned = false;
  //   // });
  // });
  // }, 1000);

  const [result, setResult] = React.useState([]);
  const postsCollection = rdatabase.get('posts');

  React.useEffect(() => {
    (async () => {
      await rdatabase.action(async () => {
        const allPostsx = await postsCollection.query().fetch();
        allPostsx.forEach(async (p) => await p.destroyPermanently());
        const newPost = await postsCollection.create((post) => {
          post.title = 'New post 2';
          post.body = 'Lorem ipsum...';
          post.is_pinned = false;
        });
      });
      const allPosts = await postsCollection.query().fetch();
      // console.log(allPosts);
      setResult(allPosts);
    })();

    // return () => adapter.close();
  }, []);

  return (
    <View style={styles.container}>
      {result.map((p, i) => (
        <Text key={p.id}>{p.title}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
