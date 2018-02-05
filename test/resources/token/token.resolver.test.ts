import { db, handleError, chai, app, expect } from './../../test-utils'

describe('Token', () => {

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
            )
        }).catch(handleError)
    })

    describe('Mutations', () => {

        describe('application/json', () => {

            describe('createToken', () => {

                it('should return a new valid token', () => {

                    let body = {
                        query: `
                            mutation createNewToken($email: String!, $password: String!) {
                                createToken(email: $email, password: $password) {
                                    token
                                }
                            }
                        `,
                        variables: {
                            email: "biaw@gmail.com",
                            password: "1234"
                        }
                    }

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data).to.have.key('createToken')
                            expect(res.body.data.createToken).to.have.key('token')
                            expect(res.body.data.createToken.token).to.be.string;
                            expect(res.body.errors).to.be.undefined;
                        }).catch(handleError)

                })

                it('should return an error if the password is incorrect', () => {

                    let body = {
                        query: `
                            mutation createNewToken($email: String!, $password: String!) {
                                createToken(email: $email, password: $password) {
                                    token
                                }
                            }
                        `,
                        variables: {
                            email: "biaw@gmail.com",
                            password: "12345"
                        }
                    }

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body).to.have.keys(['data', 'errors'])
                            expect(res.body.data).to.have.key('createToken')
                            expect(res.body.data.createToken).to.be.null
                            expect(res.body.errors).to.be.an('array').with.length(1)
                            expect(res.body.errors[0].message).to.equal('Unathorized, wrong email or password!')
                        }).catch(handleError)

                })

                it('should return an error if the email doesn\'t exist', () => {

                    let body = {
                        query: `
                            mutation createNewToken($email: String!, $password: String!) {
                                createToken(email: $email, password: $password) {
                                    token
                                }
                            }
                        `,
                        variables: {
                            email: "biawwww@gmail.com",
                            password: "1234"
                        }
                    }

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body).to.have.keys(['data', 'errors'])
                            expect(res.body.data).to.have.key('createToken')
                            expect(res.body.data.createToken).to.be.null
                            expect(res.body.errors).to.be.an('array').with.length(1)
                            expect(res.body.errors[0].message).to.equal('Unathorized, wrong email or password!')
                        }).catch(handleError)

                })

            })

        })

    })

})