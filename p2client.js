/* global $,io,document */
const socketio = io()
const zero = 0
const one = 1
const two = 2

move(undefined, undefined)

function move(row, column) {
    console.log('The user clicked on botton: (' + row + ',' + column + ')')
    socketio.emit('move', [row + ',' + column, [row, column]])
}

$(() => {
    socketio.on('wait', () => {
        $('#gameMessage').text('Waiting for second player to connect to game..')
        $('#gameMessage').css('color', 'red')
    })

    socketio.on('gameOn', board => {
        if (board[one] === 'p1') {
            $('#gameMessage').text('Your are player 1 and your color is blue')
            $('#gameMessage').append('<br>')
            $('#gameMessage').append('Make your move...')
            $('#gameMessage').css('color', 'blue')
        } else if (board[one] === 'p2') {
            $('#gameMessage').text('Your are player 2 and your color is purple')
            $('#gameMessage').append('<br>')
            $('#gameMessage').append('Blue is making the move...')
            $('#gameMessage').css('color', 'purple')
        }
        updateBoard(board[zero])
    })
    socketio.on('newScore', scrs => {
        $('#Scoring').text('Live Scores')
        $('#Scoring').append('<br>')
        $('#Scoring').append('Blue: ' + scrs[zero] + ' Purple: ' + scrs[one])
    })
    socketio.on('bFull_Win', winInfo => {
        if (winInfo[zero] === 'B') {
            $('#GameEndMessage').text('Blue has won the game!')
        } else if (winInfo[zero] === 'P') {
            $('#GameEndMessage').text('Purple has won the game!')
        }
        showFinalScores(winInfo)
        $('#GameEndMessage').append('Both players must restart to play again.')
        $('#GameEndMessage').append('<hr>')
        $('#GameEndMessage').css('color', 'green', 'font-size', '25px')
    })
    socketio.on('NoMoreMvs_Win', winInfo => {
        $('#Scoring').text('Both players cant make any more valid moves now.')
        $('#Scoring').css('color', 'red')
        if (winInfo[zero] === 'B') {
            $('#GameEndMessage').text('Blue has won the game!')
        } else if (winInfo[zero] === 'P') {
            $('#GameEndMessage').text('Purple has won the game!')
        }
        showFinalScores(winInfo)
        $('#GameEndMessage').append('Both players must restart to play again.')
        $('#GameEndMessage').append('<hr>')
        $('#GameEndMessage').css('color', 'green', 'font-size', '25px')
    })
    socketio.on('bFull_Draw', drawInfo => {
        $('#Scoring').text('Both players cant make any more valid moves now.')
        $('#Scoring').css('color', 'red')
        $('#GameEndMessage').text('Its a draw after all. Fancy another game?')
        $('#GameEndMessage').append('Both players must restart to play again.')
        showFinalScores(drawInfo)
        $('#GameEndMessage').css('color', 'yellow', 'font-size', '25px')
    })
    socketio.on('cantMove', color => {
        $('#gameMessage').text(color + ' cant make a move now.')
        $('#gameMessage').css('color', 'red')
    })
    socketio.on('wrongTurn', () => {
        $('#gameMessage').text('This move is either not valid or it is the')
        $('#gameMessage').append('<br>')
        $('#gameMessage').append('other players turn!')
        $('#gameMessage').css('color', 'red')
    })
    socketio.on('newGameInfo', newGameInfo => {
        if (newGameInfo[one] === 'Your Move') {
            $('#gameMessage').text('Make your next move...')
        } else if (newGameInfo[one] === 'Not Your Move') {
            $('#gameMessage').text('Waiting for the other players move...')
        }
        $('#gameMessage').css('color', 'black')
        updateBoard(newGameInfo[zero])
    })
    socketio.on('disconnected', () => {
        $('#gameMessage').text('Disconnected. Get another player to play with!')
        $('#gameMessage').append('<br>')
        $('#gameMessage').append('Both new players should refresh their pages')
        $('#gameMessage').append('<br>')
        $('#gameMessage').append('in order to start a new game.')
        $('#gameMessage').css('color', 'red')
    })
})
function updateBoard(board) {
    const boardSize = 8
    for (let i = 0;i < board.length;++i) {
        const boxNum = Math.floor(i / boardSize) + '' + i % boardSize
        if (board[i] === 'B') {
            document.getElementById('m' + boxNum).className = 'blue'
        } else if (board[i] === 'P') {
            document.getElementById('m' + boxNum).className = 'purple'
        } else {
            document.getElementById('m' + boxNum).innerHTML = ''
        }
    }
}
function showFinalScores(info) {
    $('#GameEndMessage').append('<br>')
    $('#GameEndMessage').append('Final Score:')
    $('#GameEndMessage').append('<br>')
    $('#GameEndMessage').append('Blue: ' + info[one])
    $('#GameEndMessage').append('<br>')
    $('#GameEndMessage').append('Purple: ' + info[two])
    $('#GameEndMessage').append('<hr>')
}
