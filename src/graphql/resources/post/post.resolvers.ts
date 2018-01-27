import { GraphQLResolveInfo } from "graphql";
import { DbConnection } from "../../../interfaces/DbConnectionInterface";
import { PostInstance } from "../../../models/PostModel";
import { Transaction } from "sequelize";
import { handleError, throwError } from "../../../utils/utils";
import { compose } from "../../composable/composable.resolver";
import { authResolvers } from "../../composable/auth.resolver";
import { AuthUser } from "../../../interfaces/AuthUserInterface";

/**
 * Consulta o banco de dados pelo post com o ID especificado
 * 
 * @param db A instância de conexão com o banco de dados
 * @param id O ID do post
 */
const findPost = (db: DbConnection, id) => {
    id = parseInt(id)
    return db.Post
        .findById(id)
        .then((post: PostInstance) => {
            throwError(!post, `Post with id ${id} not found`)
            throwError(post.get('author') != authUser.id, `Unathorized! You can only edit posts created by yourself!`)

            return post
        }).catch(handleError)
}

type PostAction = (t: Transaction, post: PostInstance, input?, db?: DbConnection) => any

const mutatePost = (action: PostAction): any => {
    return compose(...authResolvers)((parent, { id, input }, { db, authUser }: {db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
        return db.sequelize.transaction((t: Transaction) => {
            //Inserindo o autor no input
            if(input) input.author = authUser.id

            return findPost(db, id)
                .then( (post: PostInstance) => action(t, post, input, db) )
        }).catch(handleError)
    })
}

export const postResolvers = {
    Post: {
        author: (post, args, { db }: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.User
                .findById(post.get('author'))
                .catch(handleError)
        },

        comments: (post, { first = 10, offset = 0 }, { db }: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.Comment
                .findAll({
                    where: {post: post.get('id')},
                    limit: first,
                    offset: offset
                })
                .catch(handleError)
        }
    },

    Query: {
        posts: (parent, { first = 10, offset = 0 }, { db }: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.Post
                .findAll({
                    limit: first,
                    offset: offset
                })
                .catch(handleError)
        },

        post: (parent, {id}, {db}: {db: DbConnection}, info: GraphQLResolveInfo) =>
            findPost(db, id)
    },

    Mutation: {
        createPost: (parent, {input}, { db , authUser }: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            input.author = authUser.id
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post 
                    .create(input, {transaction: t})
            }).catch(handleError)
        },

        updatePost:
            mutatePost((t: Transaction, post: PostInstance, input, db: DbConnection) =>
                post.update(input, {transaction: t}))
        ,

        deletePost:
            mutatePost((t: Transaction, post: PostInstance, input, db: DbConnection) =>
                post.destroy({transaction: t})
                    .then((post) => !!post))
    }
}