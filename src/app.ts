import { extractJwtMiddleware } from './middlewares/extract-jwt.middleware';
import * as express from 'express';
import * as graphqlHTTTP from 'express-graphql';

import { schema } from './graphql/schema'
import db from './models'
import { DataLoaderFactory } from './graphql/dataloaders/DataLoaderFactory';
import { RequestedFields } from './graphql/ast/RequestedFields';

class App {

    public express: express.Application
    private dataLoaderFactory: DataLoaderFactory
    private requestedFields: RequestedFields

    constructor() {
        this.express = express()
        this.init()
    }

    private init(): void {
        this.middleware()
        this.requestedFields = new RequestedFields()
        this.dataLoaderFactory = new DataLoaderFactory(db, this.requestedFields)
    }

    private middleware(): void {

        this.express.use('/graphql',

            (req, res, next) => {
                if(process.env.NODE_ENV === 'development')
                    console.log('\n ---------- New Request ! ---------- \n')
                    
                next()
            },

            extractJwtMiddleware(),

            (req, res, next) => {
                req['context']['db'] = db
                req['context']['dataloaders'] = this.dataLoaderFactory.getLoaders()
                req['context']['requestedFields'] = this.requestedFields

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