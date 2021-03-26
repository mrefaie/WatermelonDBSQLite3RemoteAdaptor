import { Model } from '@nozbe/watermelondb';

export default class Comment extends Model {
  static table = 'comments';
  static associations = {
    posts: { type: 'belongs_to', key: 'post_id' },
  };
}
