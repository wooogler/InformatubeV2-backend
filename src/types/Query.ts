import {queryType, floatArg} from '@nexus/schema';
import {getUserId} from '../utils';

export const Query = queryType({
  definition(t) {
    t.crud.users()
    t.crud.comments()
    t.field('me', {
      type: 'User',
      nullable: true,
      resolve: (parent, args, ctx) => {
        const userId = getUserId(ctx)
        if (!userId) {
          throw new Error('Invalid userId')
        }
        return ctx.prisma.user.findOne({
          where: {
            id: parseInt(userId),
          },
        })
      },
    })
    t.list.field("viewComments", {
      type: 'Comment',
      args: {
        sortNum: floatArg({ required: true }),
      },
      resolve: async (_, {sortNum}, ctx) => {
        console.log('viewComments');
        const comments = await ctx.prisma.comment.findMany();
        comments.sort((a,b) => Math.abs(sortNum-a.sort)-Math.abs(sortNum-b.sort));
        return comments;
      }
    })
    t.list.field("viewRandomComments", {
      type: 'Comment',
      resolve: async (_, args, ctx) => {
        console.log('viewRandomComments');
        const comments = await ctx.prisma.comment.findMany();
        const randomComments = []
        const randomComment = comments[Math.floor(Math.random() * comments.length)];
        randomComments.push(randomComment);
        return randomComments;
      }
    })
  },
})