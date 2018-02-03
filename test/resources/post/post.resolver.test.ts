import * as jwt from 'jsonwebtoken'


import { db, app, handleError, chai, expect } from './../../test-utils'
import { JWT_SECRET } from '../../../src/utils/utils';
import { UserInstance } from '../../../src/models/UserModel';
import { PostInstance } from '../../../src/models/PostModel';

describe('Post', () => {
    
    let userId: number
    let postId: number
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
                userId = user.get('id')
                const payload = {sub: userId}
                token = jwt.sign(payload, JWT_SECRET)
                
                return db.Post.bulkCreate([
                    {
                        title: 'First Post',
                        content: 'First post',
                        author: userId,
                        photo: "hey"
                    },{
                        title: 'Second Post',
                        content: 'Second post',
                        author: userId,
                        photo: "hey"
                    },{
                        title: 'Third Post',
                        content: 'Third post',
                        author: userId,
                        photo: "hey"
                    }
                ])
            }).then((posts: PostInstance[]) => {
                postId = posts[0].get('id')
            })
        })
    })
    
    describe('Queries', () => {
        
        describe('application/json', () => {
            
            describe('posts', () => {
                
                it('should return a list of Posts', () => {
                    
                    let body = {
                        query: `
                        query {
                            posts {
                                title
                                content
                                photo
                            }
                        }
                        `
                    }
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .send(JSON.stringify(body))
                    .then(res => {
                        
                        const postsList = res.body.data.posts
                        expect(res.body.data).to.be.an('object')
                        expect(postsList).to.be.an('array')
                        expect(postsList[0]).to.not.have.keys(['id', 'comments', 'author', 'createdAt', 'updatedAt'])
                        expect(postsList[0]).to.have.keys(['title', 'content', 'photo'])
                        expect(postsList[0].title).to.equal('First Post')
                    }).catch(handleError)
                    
                })
                
            })
            
            describe('post', () => {
                
                it('should return a single Post with it\'s author', () => {
                    
                    let body = {
                        query: `
                        query post($id: ID!) {
                            post(id: $id) {
                                title
                                author {
                                    name
                                    email
                                }
                                comments {
                                    comment
                                }
                            }
                        }
                        `,
                        variables: {
                            id: postId
                        }
                    }
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .send(JSON.stringify(body))
                    .then(res => {
                        
                        const singlePost = res.body.data.post
                        expect(res.body.data).to.be.an('object')
                        expect(res.body.data).to.have.key('post')
                        expect(singlePost).to.have.keys(['title', 'author', 'comments'])
                        expect(singlePost).to.not.have.keys(['content', 'photo', 'createdAt', 'updatedAt'])
                        expect(singlePost.title).to.equal('First Post')
                        expect(singlePost.author).to.be.an('object').with.not.keys(['id', 'createdAt', 'updatedAt', 'posts'])
                    }).catch(handleError)
                    
                })
                
            })
            
        })
        
        describe('application/graphql', () => {
            
            describe('posts', () => {
                
                it('should return a list of Posts', () => {
                    
                    let query = `
                    query {
                        posts {
                            title
                            content
                            photo
                        }
                    }
                    `
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/graphql')
                    .send(query)
                    .then(res => {
                        
                        const postsList = res.body.data.posts
                        expect(res.body.data).to.be.an('object')
                        expect(postsList).to.be.an('array')
                        expect(postsList[0]).to.not.have.keys(['id', 'comments', 'author', 'createdAt', 'updatedAt'])
                        expect(postsList[0]).to.have.keys(['title', 'content', 'photo'])
                        expect(postsList[0].title).to.equal('First Post')
                    }).catch(handleError)
                    
                })
                
                it('should paginate a list of Posts', () => {
                    
                    let query = `
                    query getPostsList($first: Int, $offset: Int) {
                        posts(first: $first, offset: $offset) {
                            title
                            content
                            photo
                        }
                    }
                    `
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/graphql')
                    .send(query)
                    .query({
                        variables: JSON.stringify({
                            first: 2,
                            offset: 1
                        })
                    })
                    .then(res => {
                        const postsList = res.body.data.posts
                        expect(res.body.data).to.be.an('object')
                        expect(postsList).to.be.an('array')
                        expect(postsList[0]).to.not.have.keys(['id', 'comments', 'author', 'createdAt', 'updatedAt'])
                        expect(postsList[0]).to.have.keys(['title', 'content', 'photo'])
                        expect(postsList[0].title).to.equal('Second Post')
                    }).catch(handleError)
                    
                })
                
            })
            
        })
        
    })
    
    describe('Mutations', () => {
        
        describe('application/json', () => {
            
            describe('createPost', () => {

                it('should create a new Post', () => {
                    
                    let body = {
                        query: `
                        mutation createNewPost($input: PostInput!) {
                            createPost(input: $input) {
                                id
                                title
                                content
                                author {
                                    id
                                    name
                                    email
                                }
                            }
                        }
                        `,
                        variables: {
                            input: {
                                title: 'Fourth Post',
                                content: 'Fourth Content',
                                photo: "oi"
                            }
                        }
                    }
                    
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('authorization', `Bearer ${token}`)
                    .send(JSON.stringify(body))
                    .then(res => {
                        const createdPost = res.body.data.createPost
                        expect(createdPost).to.be.an('object')
                        expect(createdPost).to.have.keys(['id', 'title', 'author', 'content'])
                        expect(createdPost.title).to.equal('Fourth Post')
                        expect(createdPost.content).to.equal('Fourth Content')
                        expect(parseInt(createdPost.author.id)).to.equal(userId)
                    }).catch(handleError)
                })
                
            })

            describe('updatePost', () => {
                
                it('should update an existing Post', () => {
                    
                    let body = {
                        query: `
                            mutation updateExistingPost($id: ID!, $input: PostInput!) {
                                updatePost(id: $id, input: $input) {
                                    title
                                    content
                                    photo
                                }
                            }
                        `,
                        variables: {
                            id: postId,
                            input: {
                                title: 'Post changed',
                                content: 'Content changed',
                                photo: "oi!"
                            }
                        }
                    }
                    
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('authorization', `Bearer ${token}`)
                    .send(JSON.stringify(body))
                    .then(res => {
                        const updatedPost = res.body.data.updatePost
                        expect(updatedPost).to.be.an('object')
                        expect(updatedPost).to.have.keys(['title', 'content', 'photo'])
                        expect(updatedPost.title).to.equal('Post changed')
                        expect(updatedPost.content).to.equal('Content changed')
                        expect(updatedPost.photo).to.equal('oi!')
                    }).catch(handleError)
                })
                
            })

            describe('deletePost', () => {
                
                it('should delete an existing Post', () => {
                    
                    let body = {
                        query: `
                            mutation deleteExistingPost($id: ID!) {
                                deletePost(id: $id)
                            }
                        `,
                        variables: {
                            id: postId
                        }
                    }
                    
                    
                    return chai.request(app)
                    .post('/graphql')
                    .set('content-type', 'application/json')
                    .set('authorization', `Bearer ${token}`)
                    .send(JSON.stringify(body))
                    .then(res => {
                        const deletedPost = res.body.data.deletePost
                        expect(deletedPost).to.equal(true)
                    }).catch(handleError)
                })
                
            })
            
        })
        
    })
    
})