'use strict'
String.prototype.replaceAt = function(idx, char) {
    return this.substr(zero, idx) + char + this.substr(idx + char.length)
}

const http = require('http')
const fs = require('fs')
const server = http.createServer((request, response) => {
    if (request.url === '/p2client.js') {
        fs.readFile('p2client.js', 'utf-8', (err, data) => {
            console.log('Client wants its JS file')
            // console.log('The client wants the client java script file')
            if (err) {
                return console.log(err)
            }
            return response.end(data) // ***** CHECK THIS!!!!
        })
    } else {
        fs.readFile('p2client.html', 'utf-8', (err, data) => {
            console.log('The client wants the client HTML file')
            if (err) {
                return console.log(err)
            }
            const headLength = 200
            response.writeHead(headLength, {'Content-Type': 'text/html'})
            response.write(data, 'binary')
            return response.end() // ***** CHECK THIS!!!!
        })
    }
})

const io = require('socket.io')(server)
const listeningPort = 8000
server.listen(listeningPort)
console.log('Server listening at http://<IP>:8000 ...')

// format of board: 'm00m01m02m03m04m05m06m07m10m11m12m13m14m15m16m17m20m21
const boardSize = 8
const zero = 0
const one = 1
const two = 2
const NW_DIST = -9
const NORTH_DIST = -8
const NE_DIST = -7
const EAST_DIST = 1
const SE_DIST = 9
const SOUTH_DIST = 8
const SW_DIST = 7
const WEST_DIST = -1
const allDirs = [idxNorthOf, idxNEof, idxEastOf, idxSEof, idxSouthOf, idxSWof,
    idxWestOf, idxNWof]
const chksInAllDirs = [
    chkNorthOf,
    chkNEof,
    chkEastOf,
    chkSEof,
    chkSouthOf,
    chkSWof,
    chkWestOf,
    chkNWof]
const chksInAllDirsAndNoChng = [
    chkNorthOfAndNoChng,
    chkNEofAndNoChng,
    chkEastOfAndNoChng,
    chkSEofAndNoChng,
    chkSouthOfAndNoChng,
    chkSWofAndNoChng,
    chkWestOfAndNoChng,
    chkNWofAndNoChng]
const gamesInfo = []
let waitingPSocket = undefined

io.sockets.on('connection', socket => {
    createNewGameOrWait(socket)
    onDisconnect(socket)
    onMove(socket)
})
function createNewGameOrWait(socket) {
    if (waitingPSocket === undefined) {
        waitingPSocket = socket
        waitingPSocket.emit('wait')
    } else {
        const game = newGame(waitingPSocket, socket)
        gamesInfo.push(game)
        console.log('Length of gamesInfo: ' + gamesInfo.length)

        game.p1Socket.emit('gameOn', [game.board, 'p1'])
        game.p2Socket.emit('gameOn', [game.board, 'p2'])
        waitingPSocket = undefined
    }
}
function onMove(s) {
    s.on('move', p => {
        if (p[one][zero]) {
            if (s === waitingPSocket) {
                s.emit('wait')
            } else if (hasTurn(s)[zero] && isValidMove(s, p[zero])) {
                getGame(s).board = updateBoard(getGame(s).board, p[one],
                    hasTurn(s)[one])
                updateScores(getGame(s))
                switchTurns(s, getGame(s))
                emitToPlayers(getGame(s))
                checkWinCondition(getGame(s))
                countAllValidMoves(getGame(s))
            } else {
                s.emit('wrongTurn')
            }
        }
    })
}
function isValidMoveAndNoChng(s, pos) {
    const p = getCurrPositions(s)
    let posAdjOppons = filterPtsAdjOppons(p[zero], p[one], p[two])
    posAdjOppons = [].concat.apply([], posAdjOppons)
    const valid = chkAgnstOpponsPts(posAdjOppons, p[one], p[two], pos, false)
    return boxIsEmpty(s, pos) && valid
}
function countAllValidMoves(game) {
    const empBoxs = getEmptyBoxes(game) // empty boxes
    const validMovesP1 = [] // (P1 is blue)
    const validMovesP2 = [] // (P2 is blue)
    for (let i = 0; i < empBoxs.length; ++i) {
        const p = toCoords(empBoxs[i])[zero] + ',' + toCoords(empBoxs[i])[one]
        validMovesP1.push(isValidMoveAndNoChng(game.p1Socket, p))
        validMovesP2.push(isValidMoveAndNoChng(game.p2Socket, p))
    }
    const p1CanMove = areAnyTrue(validMovesP1)
    const p2CanMove = areAnyTrue(validMovesP2)
    chkVldMvsWinCond(game, p1CanMove, p2CanMove)
}
function chkVldMvsWinCond(game, p1CanMove, p2CanMove) {
    if (!p1CanMove && !p2CanMove) {
        chkNoMoreMvsWin(game)
    } else if (p1CanMove && !p2CanMove) {
        game.nextMove = game.p1Socket
        emitToPlayers(game)
        game.p2Socket.emit('cantMove', 'Purple')
    } else if (!p1CanMove && p2CanMove) {
        game.nextMove = game.p2Socket
        emitToPlayers(game)
        game.p2Socket.emit('cantMove', 'Blue')
    } else {
        console.log('Both players can still move!')
    }
}
function chkNoMoreMvsWin(game) {
    if (game.p1Score > game.p2Score) {
        game.p1Socket.emit('NoMoreMvs_Win', ['B', game.p1Score, game.p2Score])
        game.p2Socket.emit('NoMoreMvs_Win', ['B', game.p1Score, game.p2Score])
        game.p1Socket.disconnect()
    } else if (game.p1Score < game.p2Score) {
        game.p1Socket.emit('NoMoreMvs_Win', ['P', game.p1Score, game.p1Score])
        game.p2Socket.emit('NoMoreMvs_Win', ['P', game.p1Score, game.p1Score])
        game.p1Socket.disconnect()
    } else {
        game.p1Socket.emit('NoMoreMvs_Draw', ['P', game.p1Score, game.p2Score])
        game.p2Socket.emit('NoMoreMvs_Draw', ['P', game.p1Score, game.p2Score])
        game.p1Socket.disconnect()
    }
}
function checkWinCondition(game) {
    if (boardIsFull(game.board)) {
        if (game.p1Score > game.p2Score) {
            game.p1Socket.emit('bFull_Win', ['B', game.p1Score, game.p2Score])
            game.p2Socket.emit('bFull_Win', ['B', game.p1Score, game.p2Score])
            game.p1Socket.disconnect()
        } else if (game.p1Score < game.p2Score) {
            game.p1Socket.emit('bFull_Win', ['P', game.p1Score, game.p1Score])
            game.p2Socket.emit('bFull_Win', ['P', game.p1Score, game.p1Score])
            game.p1Socket.disconnect()
        } else {
            emitBoardFullDraw(game)
        }
    }
}
function emitBoardFullDraw(game) {
    game.p1Socket.emit('bFull_Draw', ['P', game.p1Score, game.p2Score])
    game.p2Socket.emit('bFull_Draw', ['P', game.p1Score, game.p2Score])
    game.p1Socket.disconnect()
}
function boardIsFull(b) {
    for (let i = 0; i < b.length; ++i) {
        if (b[i] === ' ') {
            return false
        }
    }
    return true
}
function isValidMove(s, pos) {
    // get all the current positions of this player on the board & player number
    const p = getCurrPositions(s)
    let posAdjOppons = filterPtsAdjOppons(p[zero], p[one], p[two])
    posAdjOppons = [].concat.apply([], posAdjOppons)
    const valid = chkAgnstOpponsPts(posAdjOppons, p[one], p[two], pos, true)
    return boxIsEmpty(s, pos) && valid
}
function chkAgnstOpponsPts(pnts, p, g, tP, andChange) {
    // g = game
    // tP = targetPos
    // p = pNum (player number)
    const results = []
    for (let i = 0; i < pnts.length; ++i) {
        if (andChange === true) {
            for (let j = 0; j < chksInAllDirs.length; ++j) {
                results.push(chksInAllDirs[j](pnts[i][two], p, g, tP))
            }
        } else {
            for (let j = 0; j < chksInAllDirsAndNoChng.length; ++j) {
                results.push(chksInAllDirsAndNoChng[j](pnts[i][two], p, g, tP))
            }
        }
    }
    return areAnyTrue(results)
}
function areAnyTrue(arr) {
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i] === true) {
            return true
        }
    }
    return false
}
function getOpponColor(p) {
    if (p === 'p1') {
        return 'P'
    }
    return 'B'
}
function chkWestOf(pnt, pNum, game, targetPos) {
    let idx = idxWestOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxWestOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, WEST_DIST, pnt, idx)
        }
    }
    return false
}
function chkNorthOf(pnt, pNum, game, targetPos) {
    let idx = idxNorthOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxNorthOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, NORTH_DIST, pnt, idx)
        }
    }
    return false
}
function chkNEof(pnt, pNum, game, targetPos) {
    let idx = idxNEof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxNEof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, NE_DIST, pnt, idx)
        }
    }
    return false
}
function chkNWof(pnt, pNum, game, targetPos) {
    let idx = idxNWof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxNWof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, NW_DIST, pnt, idx)
        }
    }
    return false
}
function chkEastOf(pnt, pNum, game, targetPos) {
    let idx = idxEastOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxEastOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, EAST_DIST, pnt, idx)
        }
    }
    return false
}
function chkSWof(pnt, pNum, game, targetPos) {
    let idx = idxSWof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxSWof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, SW_DIST, pnt, idx)
        }
    }
    return false
}
function chkSEof(pnt, pNum, game, targetPos) {
    let idx = idxSEof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxSEof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, SE_DIST, pnt, idx)
        }
    }
    return false
}
function chkSouthOf(pnt, pNum, game, targetPos) {
    let idx = idxSouthOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxSouthOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return updtOpponDsks(opponentColor, game, SOUTH_DIST, pnt, idx)
        }
    }
    return false
}

function chkWestOfAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxWestOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxWestOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkNorthOfAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxNorthOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxNorthOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkNEofAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxNEof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxNEof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkNWofAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxNWof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxNWof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkEastOfAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxEastOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxEastOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkSWofAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxSWof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxSWof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkSEofAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxSEof(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxSEof(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}
function chkSouthOfAndNoChng(pnt, pNum, game, targetPos) {
    let idx = idxSouthOf(toCoords(pnt)[zero], toCoords(pnt)[one])[one]
    if (idx === zero - one) {
        return false
    }
    const opponentColor = getOpponColor(pNum)
    while (game.board[idx] === opponentColor) {
        idx = idxSouthOf(toCoords(idx)[zero], toCoords(idx)[one])[one]
        if (idx === zero - one) {
            return false
        } else if (idx === toIdx(targetPos)) {
            return true
        }
    }
    return false
}


function updtOpponDsks(oppColor, game, dist, start, end) {
    let i = start + dist
    let count = 0
    while (i !== end) {
        if (oppColor === 'B') {
            game.board = game.board.replaceAt(i, 'P')
        } else if (oppColor === 'P') {
            game.board = game.board.replaceAt(i, 'B')
        }
        // console.log('The position modified with this move: ' + toCoords(i))
        i = i + dist
        count++
    }
    return true
}
function updateScores(game) {
    // console.log('----------------------------------------')
    // printBoard(game.board)
    // console.log('Blue: ' + game.p1Score + ' Purple: ' + game.p2Score)
    let countBlue = 0
    let countPurple = 0
    for (let i = 0; i < game.board.length; ++i) {
        if (game.board[i] === 'B') {
            countBlue++
        } else if (game.board[i] === 'P') {
            countPurple++
        }
    }
    game.p1Score = countBlue
    game.p2Score = countPurple
    game.p1Socket.emit('newScore', [countBlue, countPurple])
    game.p2Socket.emit('newScore', [countBlue, countPurple])
    // console.log('Blue: ' + game.p1Score + ' Purple: ' + game.p2Score)
    // console.log('----------------------------------------')
}
// function printBoard(board) {
//     console.log('  01234567')
//     let str = ''
//     for (let i = 0; i < board.length; ++i) {
//         if ((i + one) % boardSize === zero) {
//             console.log(Math.floor(i / boardSize) + ' ' + str)
//             str = ''
//         } else {
//             str = str + board[i]
//         }
//     }
// }
function getEmptyBoxes(game) {
    const arr = []
    for (let i = 0; i < game.board.length; ++i) {
        if (game.board[i] === ' ') {
            arr.push(i)
        }
    }
    return arr
}
function getCurrPositions(s) {
    const game = getGame(s)
    const positions = []
    let p = ''
    for (let i = 0; i < game.board.length; ++i) {
        if (s === game.p1Socket && game.board[i] === 'B') {
            positions.push(i)
            p = 'p1'
        } else if (s === game.p2Socket && game.board[i] === 'P') {
            positions.push(i)
            p = 'p2'
        }
    }
    return [positions, p, game]
}
function filterPtsAdjOppons(positions, pNum, game) {
    // returns all the positions for the plaer for whom it is called that are...
    // adjacent to some opponent disk!

    // for each position (idx), check in each immediate box in each direction...
    // to see if there is an opponent disk there. if yes, then add this idx and
    // the index at which the opponent disk was fond to the hash
    const a = []
    if (positions !== undefined) {
        for (let i = 0; i < positions.length; ++i) {
            a.push(checkInAllDirs(positions[i], pNum, game))
        }
    } else {
        console.error('XXXXXX The positions received are undefined!! XXXXXX')
    }
    return a
}
function checkInAllDirs(pnt, pNum, game) {
    const arr = []
    for (let i = 0; i < allDirs.length; ++i) {
        const p = allDirs[i](toCoords(pnt)[zero], toCoords(pnt)[one])
        if (p[one] !== zero - one) {
            if (pNum === 'p1' && game.board[p[one]] === 'P') {
                p.push(pnt)
                arr.push(p)
            } else if (pNum === 'p2' && game.board[p[one]] === 'B') {
                p.push(pnt)
                arr.push(p)
            }
        }
    }
    return arr
}
function boxIsEmpty(s, p) {
    const row = parseInt((p.split(','))[zero])
    const column = parseInt((p.split(','))[one])
    const idx = row * boardSize + column
    if (getGame(s).board[idx] === ' ') {
        return true
    }
    return false
}
function emitToPlayers(g) {
    // emits the updates game board to all the players in this game
    if (g.nextMove === g.p1Socket) {
        g.p1Socket.emit('newGameInfo', [g.board, 'Your Move'])
        g.p2Socket.emit('newGameInfo', [g.board, 'Not Your Move'])
    } else {
        g.p2Socket.emit('newGameInfo', [g.board, 'Your Move'])
        g.p1Socket.emit('newGameInfo', [g.board, 'Not Your Move'])
    }
}
function hasTurn(s) {
    for (let i = 0; i < gamesInfo.length; ++i) {
        if (gamesInfo[i].p1Socket === s || gamesInfo[i].p2Socket === s) {
            if (gamesInfo[i].nextMove === s) {
                if (gamesInfo[i].p1Socket === s) {
                    return [true, 'p1']
                } else if (gamesInfo[i].p2Socket === s) {
                    return [true, 'p2']
                }
            }
            // console.log('Has turn returning false 1')
            return false
        }
    }
    return false
    // return console.error(s + ' could not be found in the gamesInfo!')
}
function switchTurns(s, game) {
    if (game.p1Socket === s) {
        game.nextMove = game.p2Socket
    } else if (game.p2Socket === s) {
        game.nextMove = game.p1Socket
    } else {
        console.log('XXX COULD NOT FIND THIS SOCKET IN GAME! XXX')
    }
}
function onDisconnect(s) {
    s.on('disconnect', () => {
        if (s === waitingPSocket) {
            waitingPSocket = undefined
        } else {
            const g = gameToDisconnect(s)
            if (g[zero] === true) {
                g[one].emit('disconnected')
                const otherPlayer = g[one]
                gamesInfo.splice(g[two], one)
                otherPlayer.disconnect()
            } else {
                s.emit('disconnected')
                // console.log('----> This game has already been deleted!')
            }
        }
    })
}
function gameToDisconnect(s) {
    // returns te game in which this player belonged to and also returns some...
    // extra stuff
    for (let i = 0; i < gamesInfo.length; ++i) {
        if (gamesInfo[i].p1Socket === s) {
            return [true, gamesInfo[i].p2Socket, i]
        } else if (gamesInfo[i].p2Socket === s) {
            return [true, gamesInfo[i].p1Socket, i]
        }
    }
    // return console.error('xxx Found no game with this player in it! ' + s)
    return [false]
}
function newGame(p1socket, p2socket) {
    return {
        p1Socket: p1socket,
        p2Socket: p2socket,
        p1Score: two,
        p2Score: two,
        nextMove: p1socket,
        board: makeNewGameBoard() }
}
function updateBoard(oldBoard, newPos, pNum) {
    let newBoard = ''
    for (let i = 0;i < oldBoard.length;i++) {
        if (i === newPos[zero] * boardSize + newPos[one]) {
            if (pNum === 'p1') {
                newBoard = newBoard + 'B'
            } else if (pNum === 'p2') {
                newBoard = newBoard + 'P'
            }
        } else {
            newBoard = newBoard + oldBoard[i]
        }
    }
    return newBoard
}
function getGame(s) {
    // gets the game in which this player is playing
    for (let i = 0; i < gamesInfo.length; ++i) {
        if (gamesInfo[i].p1Socket === s || gamesInfo[i].p2Socket === s) {
            return gamesInfo[i]
        }
    }
    return console.log('Player ' + s + ' could not be found in any game!')
}
function makeNewGameBoard() {
    // this function makes the board for a game that is currently
    // in the waiting stage, i.e, waiting for another player to connect!

    return '                           PB      BP                           '
    // return 'PBBBBBBBPPBBPBBBPPBPBPPBPBBPPBPBBBBPPPBBBBPBPBPBPPBPBBBB  BBBBBB'

    // a player cant make another move layout
    // return 'BBBBBBP BPBPBPPBBBB P P BPBBBPPBBBBBB P BBBBBB PBPP B P  PPPPP B'
}
function toCoords(idx) {
    return [Math.floor(idx / boardSize), idx % boardSize]
}
function idxNorthOf(r, c) {
    if (r - one < zero) {
        return ['N', zero - one]
    }
    const idx = boardSize * (r - one) + c
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['N', zero - one]
    }
    return ['N', idx]
}
function idxNWof(r, c) {
    if (r - one < zero || c - one < zero) {
        return ['NW', zero - one]
    }
    const idx = boardSize * (r - one) + (c - one)
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['NW', zero - one]
    }
    return ['NW', idx]
}
function idxNEof(r, c) {
    // if newRow < 0 || newColumn > 7
    if (r - one < zero || c + one > boardSize - one) {
        return ['NE', zero - one]
    }
    const idx = boardSize * (r - one) + (c + one)
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['NE', zero - one]
    }
    return ['NE', idx]
}
function idxWestOf(r, c) {
    if (c - one < zero) {
        return ['W', zero - one]
    }
    const idx = boardSize * r + (c - one)
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['W', zero - one]
    }
    return ['W', idx]
}
function idxSWof(r, c) {
    if (r + one > boardSize - one || c - one < zero) {
        return ['SW', zero - one]
    }
    const idx = boardSize * (r + one) + (c - one)
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['SW', zero - one]
    }
    return ['SW', idx]
}
function idxSouthOf(r, c) {
    if (r + one > boardSize - one) {
        return ['S', zero - one]
    }
    const idx = boardSize * (r + one) + c
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['S', zero - one]
    }
    return ['S', idx]
}
function idxSEof(r, c) {
    if (r + one > boardSize - one || c + one > boardSize - one) {
        return ['SE', zero - one]
    }
    const idx = boardSize * (r + one) + (c + one)
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['SE', zero - one]
    }
    return ['SE', idx]
}
function idxEastOf(r, c) {
    if (c + one > boardSize - one) {
        return ['E', zero - one]
    }
    const idx = boardSize * r + (c + one)
    if (idx < zero || idx > boardSize * boardSize - one) {
        return ['E', zero - one]
    }
    return ['E', idx]
}
function toIdx(coords) {
    const row = parseInt((coords.split(','))[zero])
    const column = parseInt((coords.split(','))[one])
    return row * boardSize + column
}
