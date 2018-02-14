import { extractJwtMiddleware } from './middlewares/extract-jwt.middleware';
import * as express from 'express';
import * as graphqlHTTTP from 'express-graphql';
import * as cors from "cors";
import * as compression from "compression";
import * as helmet from "helmet";

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

        this.express.use(cors({
            origin: '*',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Encoding'],
            preflightContinue: false,
            optionsSuccessStatus: 204
        }))

        this.express.use(compression())

        this.express.use(helmet())

        this.express.use('/graphql',

            (req, res, next) => {
                if(process.env.NODE_ENV === 'development')
                    console.log('\n ---------- New Request ! ---------- \n')
                    
                next()
            },

            (req, res, next) => {
                //Se o log do sequelize foi customizado
                if(db.customLog) {
                    //Em dev., resetamos ele para
                    //a config. padrão (prints no console)
                    if(process.env.NODE_ENV === 'development')
                        db.sequelize.options.logging = (msg) => console.log(msg)
                    //Caso contrário, desabilitamos o log
                    else db.sequelize.options.logging = false
                }

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