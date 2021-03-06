import { AuthUser } from './AuthUserInterface';
import { DbConnection } from './DbConnectionInterface';
import { DataLoaders } from './DataLoaderInterface';
import { RequestedFields } from '../graphql/ast/RequestedFields';

export interface ResolverContext {
    db?: DbConnection
    authorization?: string
    authUser?: AuthUser
    dataloaders?: DataLoaders
    requestedFields?: RequestedFields
}