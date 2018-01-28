import * as DataLoader from "dataloader"

import { DbConnection } from "../../interfaces/DbConnectionInterface";
import { PostInstance } from "../../models/PostModel";
import { UserInstance } from "../../models/UserModel";
import { UserLoader } from "./UserLoader";
import { PostLoader } from "./PostLoader";
import { DataLoaders } from "../../interfaces/DataLoaderInterface";

export class DataLoaderFactory {
    constructor(
        private db: DbConnection 
    ) {}

    getLoaders(): DataLoaders {
        return {
            userLoader: new DataLoader<number, UserInstance>(
                (ids: number[]) => UserLoader.batchUsers(this.db.User, ids)
            ),
            postLoader: new DataLoader<number, PostInstance>(
                (ids: number[]) => PostLoader.batchPosts(this.db.Post, ids)
            )
        }
    }
}