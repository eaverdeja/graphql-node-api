import { ResolverContext } from '../../interfaces/ResolverContextInterface';
import { ComposableResolver } from './composable.resolver';
import { GraphQLFieldResolver } from 'graphql';

export const authResolver: ComposableResolver<any, ResolverContext> =
    (resolver: GraphQLFieldResolver<any, ResolverContext>): GraphQLFieldResolver<any, ResolverContext> => {
        return (parent, args, context: ResolverContext, info) => {
            if(context.user || context.authorization) {
                return resolver(parent, args, context, info)
            }

            throw new Error("Unathorized! Token not provided!")
        }
    }