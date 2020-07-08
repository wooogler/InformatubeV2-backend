import {mutationType, objectType, stringArg, intArg, arg, asNexusMethod, scalarType} from '@nexus/schema';
import { GraphQLUpload } from 'graphql-upload';
import { sign } from 'jsonwebtoken';
import { APP_SECRET, getUserId, userOrder } from '../utils';
import * as shortid from 'shortid';
import { createWriteStream } from 'fs';

const File = objectType({
  name: "File",
  definition(t) {
    t.string("filename")
    t.string("mimetype")
    t.string("encoding")
  }
})

export const Upload = scalarType({
  name: GraphQLUpload.name,
  asNexusMethod: 'upload', // We set this to be used as a method later as `t.upload()` if needed
  description: GraphQLUpload.description,
  serialize: GraphQLUpload.serialize,
  parseValue: GraphQLUpload.parseValue,
  parseLiteral: GraphQLUpload.parseLiteral,
});

const storeUpload = async ({ stream, filename }): Promise<any> => {
  const path = `images/${shortid.generate()}.png`

  return new Promise((resolve, reject) =>
    stream
      .pipe(createWriteStream(path))
      .on('finish', () => resolve({ path }))
      .on('error', reject),
  )
}

const processUpload = async upload => {
  const { createReadStream, filename, mimetype, encoding } = await upload
  const stream = createReadStream()
  const { path } = await storeUpload({ stream, filename })
  return path;
}

export const Mutation = mutationType({
  definition(t) {
    t.field('login', {
      type: 'AuthPayload',
      args: {
        name: stringArg({nullable: false}),
      },
      resolve: async (parent, {name}, ctx) => {
        const user = await ctx.prisma.user.findOne({
          where: {
            name,
          }
        })
        if (!user) {
          //없을 경우 그냥 signin 작업을 자동으로 함.
          const newUser = await ctx.prisma.user.create({
            data: {
              name,
            }
          })
          console.log('New User: ', newUser);
          return {
            token: sign({ userId: newUser.id }, APP_SECRET),
            user: newUser,
          }
        }
        console.log('Existing User: ', user);
        return {
          token: sign({userId: user.id}, APP_SECRET),
          user,
        }
      }
    })

    t.field('createComment', {
      type: 'Comment',
      args: {
        text: stringArg(),
        time: stringArg(),
        url: stringArg(),
        image: arg({type: 'Upload'})
      },
      resolve: async (_, {text, time, url, image}, ctx) => {
        console.log(image);
        const imageUrl = await processUpload(image);
        console.log(imageUrl);
        const userId = getUserId(ctx);
        if (!userId) {
          throw new Error('Invalid userId');
        }
        if(text && time && url) {
          return ctx.prisma.comment.create({
            data: {
              text,
              time,
              url,
              author: {
                connect: {id: Number.parseInt(userId)}
              },
              imageUrl,
            }
          })
        }
        throw new Error('No text or time or url');
      }
    })

    t.field('like', {
      type: 'Comment',
      args: {
        commentId: intArg(),
      },
      resolve: (_, {commentId}, ctx) => {
        const userId = getUserId(ctx);
        if (!userId) {
          throw new Error('Invalid userId');
        }
        console.log(`${userId} likes ${commentId}`);
        return ctx.prisma.comment.update({
          where: {id: commentId},
          data: {
            likeUsers: {
              connect: {
                id: Number.parseInt(userId)
              }
            }
          }
        })
      }
    })

    t.field('cancelLike', {
      type: 'Comment',
      args: {
        commentId: intArg(),
      },
      resolve: (_, {commentId}, ctx) => {
        const userId = getUserId(ctx);
        if (!userId) {
          throw new Error('Invalid userId');
        }
        console.log(`${userId} cancels to like ${commentId}`);
        return ctx.prisma.comment.update({
          where: {id: commentId},
          data: {
            likeUsers: {
              disconnect: {
                id: Number.parseInt(userId)
              }
            }
          }
        })
      }
    })

    t.field('dislike', {
      type: 'Comment',
      args: {
        commentId: intArg(),
      },
      resolve: (_, {commentId}, ctx) => {
        const userId = getUserId(ctx);
        if (!userId) {
          throw new Error('Invalid userId');
        }
        console.log(`${userId} dislikes ${commentId}`);
        return ctx.prisma.comment.update({
          where: {id: commentId},
          data: {
            dislikeUsers: {
              connect: {
                id: Number.parseInt(userId)
              }
            }
          }
        })
      }
    })

    t.field('cancelDislike', {
      type: 'Comment',
      args: {
        commentId: intArg(),
      },
      resolve: (_, {commentId}, ctx) => {
        const userId = getUserId(ctx);
        if (!userId) {
          throw new Error('Invalid userId');
        }
        console.log(`${userId} cancels to dislike ${commentId}`);
        return ctx.prisma.comment.update({
          where: {id: commentId},
          data: {
            dislikeUsers: {
              disconnect: {
                id: Number.parseInt(userId)
              }
            }
          }
        })
      }
    })
    
    t.boolean("sortWithCF", {
      args: {
        likeId: intArg({list: true}),
        dislikeId: intArg({list: true}),
      },
      resolve: async (_, {likeId, dislikeId}, ctx) => {
        const allUsers = await ctx.prisma.user.findMany({
          orderBy: {
            id: 'asc',
          }
        });
        const allComments = await ctx.prisma.comment.findMany({
          include: {
            likeUsers: true,
            dislikeUsers: true,
          },
          orderBy: {
            id: 'asc',
          }
        });
        allUsers.pop();
        let matrix:number[][] = [];
        allComments.forEach((comment) => {
          let row = [];
          for(let i=0;i<allUsers.length;i++) {
            if(comment.likeUsers.find(likeUser => likeUser.id === allUsers[i].id)) {
              row.push(1);
            }
            else if(comment.dislikeUsers.find(dislikeUser => dislikeUser.id === allUsers[i].id)){
              row.push(-1);
            } else {
              row.push(0);
            }
          }
          matrix.push(row);
        })
        
        let evalArray = []
        if(likeId && dislikeId) {
          for (let i=0; i<allComments.length; i++) {
            if(likeId.includes(allComments[i].id)){
              evalArray.push(1);
            } else if(dislikeId.includes(allComments[i].id)) {
              evalArray.push(-1);
            } else {
              evalArray.push(0);
            }
          }
        }
        const cfSortedArray = userOrder(matrix, evalArray);
        
        const min = Math.min(...cfSortedArray);
        const max = Math.max(...cfSortedArray);
        const normCfSortedArray = cfSortedArray.map(num => (num-min)/(max-min));
        console.log(normCfSortedArray);
        for(let i=0;i<allComments.length;i++) {
          await ctx.prisma.comment.update({
            where: { id: allComments[i].id },
            data: { sort: normCfSortedArray[i]},
          })
        }
        console.log('sorted!')
        return true;
      }
    })
  }
})