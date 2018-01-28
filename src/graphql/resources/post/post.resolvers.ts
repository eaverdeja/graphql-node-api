import { GraphQLResolveInfo } from "graphql";
import { DbConnection } from "../../../interfaces/DbConnectionInterface";
import { PostInstance, PostAttributes } from "../../../models/PostModel";
import { Transaction, FindOptions } from "sequelize";
import { handleError, throwError } from "../../../utils/utils";
import { compose } from "../../composable/composable.resolver";
import { authResolvers } from "../../composable/auth.resolver";
import { AuthUser } from "../../../interfaces/AuthUserInterface";
import { DataLoaders } from "../../../interfaces/DataLoaderInterface";
import { ResolverContext } from "../../../interfaces/ResolverContextInterface";

/**
 * Consulta o banco de dados pelo post com o ID especificado
 * 
 * @param db A instância de conexão com o banco de dados
 * @param id O ID do post
 * @param options Um objeto de configurações para a consulta do sequelize
 */
const findPost = (db: DbConnection, id, options: FindOptions<PostAttributes> = {}) => {
    id = parseInt(id)
    return db.Post
        .findById(id, options)
        .then((post: PostInstance) => {
            throwError(!post, `Post with id ${id} not found`)

            return post
        }).catch(handleError)
}

type PostAction = (t: Transaction, post: PostInstance, input?, db?: DbConnection) => any

const mutatePost = (action: PostAction): any => {
    return compose(...authResolvers)((parent, { id, input }, { db, authUser }: {db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
        return db.sequelize.transaction((t: Transaction) => {
            //Inserindo o usuário autenticado como autor no input
            if(input) input.author = authUser.id

            return findPost(db, id)
                .then( (post: PostInstance) => {
                    throwError(post.get('author') != authUser.id, `Unathorized! You can only edit posts created by yourself!`)
    
                    return action(t, post, input, db) 
                })

        }).catch(handleError)
    })
}

export const postResolvers = {
    Post: {
        author: (post, args, { db, dataloaders: {userLoader} }: { db: DbConnection, dataloaders: DataLoaders }, info: GraphQLResolveInfo) => {
            return userLoader
                .load(post.get('author'))
                .catch(handleError)
        },

        comments: (post, { first = 10, offset = 0 }, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Comment
                .findAll({
                    where: {post: post.get('id')},
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info)
                })
                .catch(handleError)
        }
    },

    Query: {
        posts: (parent, { first = 10, offset = 0 }, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Post
                .findAll({
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['comments']})
                })
                .catch(handleError)
        },

        post: (parent, {id}, context: ResolverContext, info: GraphQLResolveInfo) =>
            findPost(context.db, id, {
                attributes: context
                    .requestedFields
                    .getFields(info, {
                        keep: ['id'],
                        exclude: ['comments']
                    })
            })
    },

    Mutation: {
        createPost: (parent, {input}, { db , authUser }: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            input.author = authUser.id
            console.log(authUser.id)
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