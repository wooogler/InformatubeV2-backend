import {objectType} from '@nexus/schema';

export const Comment = objectType({
  name: 'Comment',
  definition(t) {
    t.model.id()
    t.model.createdAt()
    t.model.text()
    t.model.time()
    t.model.url()
    t.model.author()
    t.model.authorId()
    t.model.likeUsers()
    t.model.dislikeUsers()
    t.model.imageUrl()
    t.model.sort()
  }
})