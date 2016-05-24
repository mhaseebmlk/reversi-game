- Part 2 works perfectly fine. Files for part 2 are: p2client.html, p2server.js, p2client.js 

- For part 3 I was able to give each client a unique ID such that even after restarting the server, the clients that were already playing the game had the same ID as they got initially. This is stored as clientsCount in the MongoDB called ’test1_reversi’.
- I used the bluebird API in order to use promises with MongoDB.