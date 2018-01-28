import { GraphQLResolveInfo } from "graphql";
import { DbConnection } from "../../../interfaces/DbConnectionInterface";
import { CommentInstance } from "../../../models/CommentModel";
import { Transaction } from "sequelize";
import { handleError, throwError } from "../../../utils/utils";
import { compose } from "../../composable/composable.resolver";
import { authResolvers } from "../../composable/auth.resolver";
import { AuthUser } from "../../../interfaces/AuthUserInterface";
import { UserLoader } from "../../dataloaders/UserLoader";
import { DataLoaders } from "../../../interfaces/DataLoaderInterface";
import { ResolverContext } from "../../../interfaces/ResolverContextInterface";

/**
 * Consulta o banco de dados pelo comment com o ID especificado
 * 
 * @param db A instância de conexão com o banco de dados
 * @param id O ID do comment
 */
const findComment = (db: DbConnection, id) => {
    id = parseInt(id)
    return db.Comment
        .findById(id)
        .then((comment: CommentInstance) => {
            throwError(!comment, `Comment with id ${id} not found`)

            return comment
        }).catch(handleError)
}

type CommentAction = (t: Transaction, comment: CommentInstance, input?, db?: DbConnection) => any

const mutateComment = (action: CommentAction): any => {
    return compose(...authResolvers)((parent, { id, input }, { db, authUser }: {db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
        return db.sequelize.transaction((t: Transaction) => {
            //Inserindo o usuário autenticado como user no input
            if(input) input.user = authUser.id

            return findComment(db, id)
                .then( (comment: CommentInstance) => {
                    throwError(comment.get('user') != authUser.id, `Unathorized! You can only edit comments created by yourself!`)

                    return action(t, comment, input, db)
                })
        }).catch(handleError)
    })
}

export const commentResolvers = {
    Comment: {
        post: (comment, args, { db, dataloaders: {postLoader} }: { db: DbConnection, dataloaders: DataLoaders }, info: GraphQLResolveInfo) => {
            return postLoader
                .load({ key: comment.get('post'), info })
                .catch(handleError)
        },

        user: (comment, args, { db, dataloaders: {userLoader} }: { db: DbConnection, dataloaders: DataLoaders }, info: GraphQLResolveInfo) => {
            return userLoader
                .load({ key: comment.get('author'), info })
                .catch(handleError)
        }
    },

    Query: {
        commentsByPost: (parent, { postId, first = 10, offset = 0 }, context: ResolverContext, info: GraphQLResolveInfo) => {
            postId = parseInt(postId)
            return context.db.Comment
                .findAll({
                    where: {post: postId},
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info)
                })
                .catch(handleError)
        }
    },

    Mutation: {
        createComment: compose(...authResolvers)((parent, {input}, { db, authUser }: { db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            input.user = authUser.id
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment 
                    .create(input, {transaction: t})
            }).catch(handleError)
        }),


        updateComment:
            mutateComment((t: Transaction, comment: CommentInstance, input) =>
                comment.update(input, {transaction: t}))
        ,

        deleteComment:
            mutateComment((t: Transaction, comment: CommentInstance, input) =>
                comment.destroy({transaction: t})
                    .then((comment) => !!comment))
    }
}