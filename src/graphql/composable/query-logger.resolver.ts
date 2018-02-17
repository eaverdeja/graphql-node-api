import { ComposableResolver } from "./composable.resolver";
import { ResolverContext } from "../../interfaces/ResolverContextInterface";
import { GraphQLFieldResolver } from "graphql";

import * as path from 'path'

import db from './../../models'
import logger from '../../utils/logger'

//Recuperamos o objeto de configuração para reconfigurar
//o logger corretamente após a execução do resolver final
const env: string = process.env.NODE_ENV || 'development'
let config = require(path.resolve(`${__dirname}./../../config/config.json`))[env]

export const queryLoggerResolver: ComposableResolver<any, ResolverContext> =
    (resolver: GraphQLFieldResolver<any, ResolverContext>): GraphQLFieldResolver<any, ResolverContext> => {
        return async (parent, args, context: ResolverContext, info) => {
            //Configuramos o sequelize para utilizar nosso logger
            db.sequelize.options.logging = (msg) => logger.info(msg)
            
            //Aguardamos a execução do resolver
            const resolved = await Promise.resolve(resolver(parent, args, context, info))
            .then(res => {
                //Loggamos no console por padrão
                let shouldLog = config.logging === false ? config.logging : true
                //Reconfiguramos o sequelize para sua configuração original
                db.sequelize.options.logging = (msg) =>
                    shouldLog? console.log(msg) : false

                //Retornamos o resultado passado para o callback
                return res
            })
            
            //Retornamos o resolver final
            return resolved
        }
    }