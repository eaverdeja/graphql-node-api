import { GraphQLResolveInfo } from "graphql";
import { DbConnection } from "../../../interfaces/DbConnectionInterface";
import { UserInstance } from "../../../models/UserModel";
import { Transaction } from "sequelize";
import { handleError, throwError } from "../../../utils/utils";
import { compose } from "../../composable/composable.resolver";
import { authResolver, authResolvers } from "../../composable/auth.resolver";
import { verifyTokenResolver } from "../../composable/verify-token.resolver";
import { AuthUser } from "../../../interfaces/AuthUserInterface";

/**
 * A mutateUsers protege resolvers específicos ao delegar a
 * a mutação específica para o callback UserAction fornecedido como parâmetro.
 * Antes de delegar para a mutação com os parâmetros necessários,
 * a função compõe os resolvers responsáveis pela autenticação da API,
 * abre uma transação no banco de dados e lança um erro caso o usuário
 * autenticado não tenha sido encontrado

 * mutateUsers protects specific resolvers by delegating the
 * specific mutation to the UserAction callback supplied as a parameter
 * Before delegating to the mutation with the necessary parameters,
 * the function composes os resolvers responsible for the API authentication,
 * opens up a DB transaction and throws and error if the
 * authenticated user wansn't found
 */
type UserAction = (t: Transaction, user: UserInstance, input?) => any

const mutateUser = (action: UserAction): any => {
    return compose(...authResolvers)((parent, {input}, { db, authUser }: {db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
        return db.sequelize.transaction((t: Transaction) => {
            return db.User
                .findById(authUser.id)
                .then((user: UserInstance) => {
                    throwError(!user, `User with id ${authUser.id} not found`)
                    return action(t, user, input)
                })
        }).catch(handleError)
    })
}

export const userResolvers = {
    User: {
        posts: (user, { first = 10, offset = 0 }, { db }: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.Post
                .findAll({
                    where: {author: user.get('id')},
                    limit: first,
                    offset: offset
                })
                .catch(handleError)
        }
    },

    Query: {
        users: (parent, { first = 10, offset = 0 }, { db }: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.User
                .findAll({
                    limit: first,
                    offset: offset
                })
                .catch(handleError)
        },

        user: (parent, {id}, {db}: {db: DbConnection}, info: GraphQLResolveInfo) => {
            id = parseInt(id)
            return db.User
                .findById(id)
                .then((user: UserInstance) => {
                    if(!user) throw new Error(`User with id ${id} not found`)
                    return user
                })
                .catch(handleError)
        },

        currentUser: compose(...authResolvers)((parent, {input}, { db, authUser }: {db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            return db.User
                .findById(authUser.id)
                .then((user: UserInstance) => {
                    throwError(!user, `User with id ${authUser.id} not found`)
                    return user
                }).catch(handleError)
        })
    },

    Mutation: {

        createUser: (parent, args, {db}: {db: DbConnection}, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.User 
                    .create(args.input, {transaction: t})
            }).catch(handleError)
        },

        updateUser: 
            mutateUser((t: Transaction, user: UserInstance, input) =>
                user.update(input, {transaction: t}))
        ,
        
        updateUserPassword:
            mutateUser((t: Transaction, user: UserInstance, input) =>
                user.update(input, {transaction: t})
                    .then((user: UserInstance) => !!user))
        ,

        deleteUser:
            mutateUser((t: Transaction, user: UserInstance) =>
                user.destroy({transaction: t})
                    .then((user) => !!user))
    }
}