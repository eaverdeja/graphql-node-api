import { extractJwtMiddleware } from './middlewares/extract-jwt.middleware';
import * as express from 'express';
import * as graphqlHTTTP from 'express-graphql';

import { schema } from './graphql/schema'
import db from './models'
import { DataLoaderFactory } from './graphql/dataloaders/DataLoaderFactory';

class App {

    public express: express.Application

    private dataLoaderFactory: DataLoaderFactory

    constructor() {
        this.express = express()
        this.init()
    }

    private init(): void {
        this.middleware()
        this.dataLoaderFactory = new DataLoaderFactory(db)
    }

    private middleware(): void {

        this.express.use('/graphql',

            extractJwtMiddleware(),

            (req, res, next) => {
                req['context']['db'] = db
                req['context']['dataloaders'] = this.dataLoaderFactory.getLoaders()
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