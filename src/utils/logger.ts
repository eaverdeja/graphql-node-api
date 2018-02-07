import * as winston from 'winston'

const fs = require( 'fs' )
const path = require('path')
const logDir = 'logs'
if ( !fs.existsSync( logDir ) ) {
    //Criamos o diretório se ele não existir
    fs.mkdirSync( logDir )
}

const inDev = process.env.NODE_ENV === 'development'

//Utilizamos o módulo path para resolver o root path da aplicação
const filename = path.join(logDir, '/query.log.txt')

const transports = [
    //Configuramos o winston para jogar os logs em um arquivo
    new winston.transports.File({ name: 'info',  filename }),
    //Se estivermos em desenvolvimento, jogamos no console
    ...(inDev ? [new winston.transports.Console({colorize: 'all'})] : []),
    //Outros transportes podem ser adicionados aqui!
    ...([])
]

//Exportamos um logger configurado
const logger = new winston.Logger({
    transports: [...transports]
})

export default logger
