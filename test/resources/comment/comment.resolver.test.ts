import * as jwt from 'jsonwebtoken'


import { db, app, handleError, chai, expect } from './../../test-utils'
import { JWT_SECRET } from '../../../src/utils/utils';
import { UserInstance } from '../../../src/models/UserModel';
import { PostInstance } from '../../../src/models/PostModel';
import { CommentInstance } from '../../../src/models/CommentModel';

describe('Comment', () => {
    
    let userId: number
    let postId: number
    let commentId: number
    let token: string
    
    beforeEach(() => {
        return db.Comment.destroy({where: {}})
        .then((rows: number) => db.Post.destroy({where: {}}))
        .then((rows: number) => db.User.destroy({where: {}}))
        .then((rows: number) => {
            return db.User.create(
                {
                    name: 'Beatriz Waclawek',
                    email: 'biaw@gmail.com',
                    password: '1234'
                }
            ).then((user: UserInstance) => {
                userId = parseInt(user.get('id'))
                const payload = {sub: userId}
                token = jwt.sign(payload, JWT_SECRET)
                
                return db.Post.create({
                    title: 'First post',
                    content: 'First content',
                    author: userId,
                    photo: "oi :)"
                })
            }).then((post: PostInstance) => {
                postId = post.get('id')
                
                return db.Comment.bulkCreate([
                    {
                        comment: 'First comment',
                        post: postId,
                        user: userId
                    },{
                        comment: 'Second comment',
                        post: postId,
                        user: userId
                    },{
                        comment: 'Third comment',
                        post: postId,
                        user: userId
                    }
                ])
            }).then((comments: CommentInstance[]) => {
                commentId = comments[0].get('id')
            }).catch(handleError)
        })
    })
    
    describe('Queries', () => {
        
        describe('application/json', () => {
            
            describe('comments', () => {
                
                it('should return a list of Comments', () => {
                    
                    let body = {
                        query: `
                        query getCommentsByPost($postId: ID!, $first: Int, $offset: Int) {
                            commentsByPost(postId: $postId, first: $first, offset: $offset) {
                                comment
                                createdAt
                                user {
                                    name
                                    email
                                }
                            }
                        }
                        `,
                        variables: {
                            postId: postId
                        }
                    }
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .send(JSON.stringify(body))
                    .then(res => {
                        const commentsList = res.body.data.commentsByPost
                        expect(res.body.data).to.be.an('object')
                        expect(commentsList).to.be.an('array')
                        expect(commentsList[0]).to.not.have.keys(['id', 'updatedAt', 'post'])
                        expect(commentsList[0]).to.have.keys(['comment', 'user', 'createdAt'])
                        expect(commentsList[0].user).to.have.keys(['name', 'email'])
                        expect(commentsList[0].comment).to.equal('First comment')
                        
                    }).catch(handleError)
                    
                })
                
            })
            
        })
    })
    
    describe('Mutations', () => {
        
        describe('application/json', () => {
            
            describe('createComment', () => {

                it('should create a new Comment', () => {
                    
                    let body = {
                        query: `
                        mutation createNewComment($input: CommentInput!) {
                            createComment(input: $input) {
                                comment
                                user {
                                    id
                                    name
                                }
                                post {
                                    id
                                    title
                                    author {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                        `,
                        variables: {
                            input: {
                                comment: 'Fourth comment',
                                post: postId
                            }
                        }
                    }
                    
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('authorization', `Bearer ${token}`)
                    .send(JSON.stringify(body))
                    .then(res => {
                        const createdComment = res.body.data.createComment
                        const post = createdComment.post
                        const author = post.author
                        
                        expect(createdComment).to.be.an('object')
                        expect(createdComment).to.have.keys(['comment', 'user', 'post'])
                        expect(createdComment.comment).to.equal('Fourth comment')
                        expect(parseInt(createdComment.user.id)).to.equal(userId)
                        expect(parseInt(author.id)).to.equal(userId)
                        expect(author).to.have.all.keys(['id', 'name'])
                        expect(parseInt(post.id)).to.equal(postId)
                    }).catch(handleError)
                })
                
            })

            describe('updateComment', () => {
                
                it('should update an existing Comment', () => {
                    
                    let body = {
                        query: `
                            mutation updateExistingComment($id: ID!, $input: CommentInput!) {
                                updateComment(id: $id, input: $input) {
                                    comment
                                    post {
                                        id
                                        title
                                        author {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        `,
                        variables: {
                            id: commentId,
                            input: {
                                comment: 'Fourth comment!!!!',
                                post: postId
                            }
                        }
                    }
                    
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('authorization', `Bearer ${token}`)
                    .send(JSON.stringify(body))
                    .then(res => {
                        const updatedComment = res.body.data.updateComment
                        const post = updatedComment.post
                        const author = post.author
                        
                        expect(updatedComment).to.be.an('object')
                        expect(updatedComment).to.have.keys(['comment', 'post'])
                        expect(updatedComment.comment).to.equal('Fourth comment!!!!')
                        expect(parseInt(author.id)).to.equal(userId)
                        expect(author).to.have.all.keys(['id', 'name'])
                        expect(parseInt(post.id)).to.equal(postId)
                    }).catch(handleError)
                })
                
            })
            
            describe('deleteComment', () => {
                
                it('should delete an existing Comment', () => {
                    
                    let body = {
                        query: `
                            mutation deleteExistingComment($id: ID!) {
                                deleteComment(id: $id)
                            }
                        `,
                        variables: {
                            id: commentId
                        }
                    }
                    
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('authorization', `Bearer ${token}`)
                    .send(JSON.stringify(body))
                    .then(res => {
                        const deletedComment = res.body.data.deleteComment
                        expect(res.body.data).to.be.an('object')
                        expect(res.body.data).to.have.key('deleteComment')
                        expect(deletedComment).to.equal(true)
                    }).catch(handleError)
                })
                
            })
            
        })
        
    })
    
})