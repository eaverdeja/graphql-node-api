import { db } from "./test-utils";

db.sequelize.sync({force: true})
    .then(() => {
        console.log(`----- Iniciando teste ----- ${new Date().toString()}`)
        run()
    })