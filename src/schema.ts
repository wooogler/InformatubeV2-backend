import {nexusPrismaPlugin} from 'nexus-prisma';
import {makeSchema, queryType, stringArg, objectType, intArg, arg, asNexusMethod } from '@nexus/schema';
import { GraphQLUpload } from 'graphql-upload';

import * as types from './types';

export const schema = makeSchema({
  types,
  plugins: [nexusPrismaPlugin()],
  outputs: {
    schema: __dirname + '/../schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  typegenAutoConfig: {
    contextType: 'Context.Context',
    sources: [
      {
        source: '@prisma/client',
        alias: 'prisma',
      },
      {
        source: require.resolve('./context'),
        alias: 'Context',
      },
    ],
  },
})