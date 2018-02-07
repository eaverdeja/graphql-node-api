import { ComposableResolver } from "./composable.resolver";
import { ResolverContext } from "../../interfaces/ResolverContextInterface";
import { GraphQLFieldResolver } from "graphql";
import db from './../../models'
import logger from '../../utils/logger'

export const queryLoggerResolver: ComposableResolver<any, ResolverContext> =
    (resolver: GraphQLFieldResolver<any, ResolverContext>, ...params): GraphQLFieldResolver<any, ResolverContext> => {
        return (parent, args, context: ResolverContext, info) => {
            //Configuramos o sequelize para utilizar nosso logger
            db.sequelize.options.logging = (msg) => logger.info(msg)
            
            return resolver(parent, args, context, info)
        }
    }