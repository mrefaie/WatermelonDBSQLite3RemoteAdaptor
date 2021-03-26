import { Model } from '@nozbe/watermelondb';

export default class Post extends Model {
  static table = 'posts';
  static associations = {
    comments: { type: 'has_many', foreignKey: 'post_id' },
  };
}
