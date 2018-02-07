import { DbConnection } from '../../../interfaces/DbConnectionInterface';
import { UserInstance } from '../../../models/UserModel';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../../utils/utils';
import { compose } from '../../composable/composable.resolver';
import { queryLoggerResolver } from '../../composable/query-logger.resolver'

export const tokenResolvers = {
    Mutation: {
        createToken: compose(queryLoggerResolver)((parent, { email, password }, {db, user}: {db: DbConnection, user: UserInstance}) => {
            return db.User.findOne({
                where: {email: email},
                attributes: ['id', 'password']
            }).then((user: UserInstance) => {
                let errorMessage: string = "Unathorized, wrong email or password!"
                if(!user || !user.isPassword(user.get('password'), password)) {
                    throw new Error(errorMessage)
                }
                const payload = {sub: user.get('id')}

                let r = {
                    token: jwt.sign(payload, JWT_SECRET)
                }

                return r
            })
        })
    }
}