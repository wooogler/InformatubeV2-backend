import {GraphQLServer} from 'graphql-yoga';
const express = require('express');
import {schema} from './schema';
import {createContext} from './context';

const server = new GraphQLServer({schema, context: createContext});

server.express.use('/images', express.static('images'));

server.start(() => {
  console.log('Server ready at: http://localhost:4000');
});
