import { extractJwtMiddleware } from './middlewares/extract-jwt.middleware';
import * as express from 'express';
import * as graphqlHTTTP from 'express-graphql';

import { schema } from './graphql/schema'
import db from './models'

class App {

    public express: express.Application

    constructor() {
        this.express = express()
        this.middleware()
    }

    private middleware(): void {

        this.express.use('/graphql',

            extractJwtMiddleware(),

            (req, res, next) => {
                req['context'].db = db
                next()
            },

            graphqlHTTTP((req) => ({
                schema,
                pretty: true,
                graphiql: process.env.NODE_ENV === 'development',
                context: req['context']
            }))
        )
    }
}

export default new App().express