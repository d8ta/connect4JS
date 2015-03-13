window.connectFour = window.connectFour || {};

connectFour.game = (function(config, Model) {
    "use strict";

$(document).ready(function() {
    var Model = function Model(game){
        //fills the board with a two dimensional array of 0
        //get the instance of the game
        this.game = game;
        this.board = [];
        for(var i = 0; i < 7; i++){
            this.board[i] = [];
            for(var j = 0; j < 6; j++){
                this.board[i][j] = 0;
            }
        }



        //firebase game demo
        this.FIREBASE_URL = 'https://shining-inferno-3227.firebaseio.com'; // in config
        this.connectionRef = new Firebase(this.FIREBASE_URL + '/.info/connected');
        this.gameList = new Firebase(this.FIREBASE_URL + '/games');


        this.name;
        this.playerId;
        this.enemy;
        this.myTurn = false;
        this.start = false;
        //if false the game is over (draw)
        this.playing = true;

        //array with the winner fields
        this.winnerFields = [];
        this.wonFields = [];
        this.playersArr = [];

    };



    //validates the oponnents turn and calls the animation of the coin
    Model.prototype.opponentTurn = function opponentTurn(moveSnapshot){
        var moves = moveSnapshot.val();

        //get the player id and the x value of the opponents turn
        if(this.start && this.playing){
            var x = 0;
            var player = 0;
            for(var move in moves){
                x = moves[move].x;
                player = moves[move].playerId;
            }

            if(this.playerId != player){
                $('h2.title').html("My turn");
                //draws my next coin on top of the playing field
                this.game.drawCoin(this.game.coinContext, this.game.bucketwidth/2, this.game.bucketheight/2, (this.game.bucketwidth/2) - 1, this.playerId);
                this.game.coinVisible = true;
                this.myTurn = true;
                var i = 5;
                while(this.board[x][i] != 0 && i >= 0){
                    i--;
                }
                //calls the animation function
                if(this.board[x][0] == 0){
                    this.board[x][i] = player;
                    this.game.isAnimating = true;
                    this.game.animateCoin((this.game.bucketwidth*x) + this.game.bucketwidth/2, this.game.bucketheight/2, (this.game.bucketwidth*i) + this.game.bucketwidth/2 + 100, player, 1);
                    //after every turn the findWinner function gets called
                    this.findWinner(x, i);
                }
            }
        }
        else{
            //draws my next coin on top of the playing field
            if(this.myTurn && this.playing){
                this.game.drawCoin(this.game.coinContext, this.game.bucketwidth/2, this.game.bucketheight/2, (this.game.bucketwidth/2) - 1, this.playerId);
                this.game.coinVisible = true;
            }
        }
        this.start = true;
    };

    //checks if the board is already full and the game is over (draw)
    Model.prototype.draw = function draw(){
        var full = true;
        for(var i = 0; i < 7; i++){
            for(var j = 0; j < 6; j++){
                if(this.board[i][j] == 0) full = false;
            }
        }
        return full;
    }

    //checks if there are 4 of the same color
    Model.prototype.findWinner = function findWinner(x, y){
        //checks if the game ends in a draw
        var exitDraw = this.draw();
        //calls the function findWinnerDirection for every direction in which there is a coin
        if(this.board[x][y] != 0){
            for(var i=-1; i<2; i++){
                for(var j=-1; j<2; j++){
                    if((i!=0 || j!=0) && (x+i)<7 && (x+i)>=0 && (y+j)<6 && (y+j)>=0){
                        var depth = 1;
                        this.winnerFields = [];
                        this.winnerFields.push({'x': x, 'y': y});
                        depth += this.findWinnerDirection(x, y, i, j);
                        depth += this.findWinnerDirection(x, y, -i, -j);
                        if(depth >= 4){
                            this.wonFields = this.winnerFields;
                            this.game.highlight = true;
                            this.playing = false;
                            $('h2.title').html("Winner is: " + this.playersArr[this.board[x][y]]);
                        }
                        if(exitDraw){
                            this.playing = false;
                            $('h2.title').html("Draw");
                        }
                    }
                }
            }
        }
    }

    //this function checks if there are coins with the same color in a given direction
    Model.prototype.findWinnerDirection = function findWinnerDirection(x, y, gox, goy){
        // get the depth in one direction
        var depth = 0;
        while((x+gox)<7 && (x+gox)>=0 && (y+goy)<6 && (y+goy)>=0 && this.board[x][y] == this.board[x+gox][y+goy]){
            x += gox;
            y += goy;
            this.winnerFields.push({'x': x, 'y': y});
            depth++;
        }
        return depth;
    }

    //To join the game with Firebase
    Model.prototype.joinGame = function joinGame(e){
        var t = e.delegateTarget;
        var gameId = $(t).parent().attr('id');
        var gameRef = new Firebase(this.FIREBASE_URL + '/games/' + gameId);
        var that = this;
        gameRef.once('value', function(gameSnapshot){
            var game = gameSnapshot.val();
            if(game){
                gameRef.child('state').transaction(function(data){
                    if(data == 'waiting'){
                        return 'playing';
                    }else
                        return;
                }, function(error, commited, snapshot){
                    if(!commited)
                        alert('Someone is playing');
                    else{
                        gameRef.on('child_removed',function(){
                            alert("player 1 left the game");
                        });
                        gameRef.onDisconnect().remove();
                        gameRef.child("player/2/name").set(that.name);

                        that.gameList.off('child_added');

                        $('.container').html('<canvas id="coins" width="700" height="700" style="z-index: 0;"></canvas><canvas id="board" width="700" height="600" style="z-index: 1;"></canvas>');
                        gameRef.child('move').on('child_added',function(moveSnapshot){
                            //console.log(moveSnapshot.val());
                        });
                        that.playerId = 2;

                        $('h2.title').html("It's not your turn");

                        that.game.setup(gameRef);
                    }
                });
            }
        });
    }



    //start the Game with Firebase
    Model.prototype.startGame = function startGame(){
        var that = this;

        this.connectionRef.on('value', function(connectionSnapshot){
            if(connectionSnapshot.val() == true){
                that.gameList.off('child_added');

                var gameRef = that.gameList.push();
                var playerArr = [];
                playerArr[1] = {name: that.name};
                that.playersArr[1] = that.name;
                gameRef.set({
                    "state": 'waiting',
                    "startPlayerId":  Math.floor((Math.random()*2)+1).toString(),
                    "player": playerArr
                });
                that.playerId = 1;
                that.connectionRef.off('value');
                gameRef.child("player/1/name").set(that.name);

                $('.container').load('waiting.html');
                gameRef.on('child_removed',function(){
                    alert("player 2 left the game");
                });
                gameRef.onDisconnect().remove();
                gameRef.child('player').on('value', function(playerSnapshot){
                    var players = playerSnapshot.val();
                    if(players[1] && players[2]){
                        $('.container').html('<canvas id="coins" width="700" height="700" style="z-index: 0;"></canvas><canvas id="board" width="700" height="600" style="z-index: 1;"></canvas>');
                        that.enemy = players[2].name;
                        that.playersArr[2] = that.enemy;
                        gameRef.child('move').on('child_added',function(moveSnapshot){
                        });

                        $('h2.title').html("Your turn");

                        that.game.setup(gameRef);
                    }
                });
            }
            else
                $('.container').append('<br><span class="error">You are not connected</span>');
        });
    };


    var Game = function Game(){
        //the game creates a new instance of the model
        this.model = new Model(this);
        this.context;
        this.coinContext;
        this.width;
        this.height;
        this.bucketwidth;
        this.bucketheight;
        //array with the player color
        this.colors = [];
        this.colors[1] = "#f00";
        this.colors[2] = "#ff0";
        this.colors[3] = "#00fcff";

        //If the coin is visible at the top
        this.coinVisible = false;
        this.coinPosition = 0;
        this.isAnimating = false;
        //to highlight the winner fields
        this.highlight = false;
        var that = this;

        //saves the Name from the #saveName Field
        $('#saveName').click(function(){
            that.model.name = $('#inputGameId').val();
            if(that.model.name == '')
                $('.container').append('<br><span class="error">Name is empty! Please enter a name. </span>');
            else{
                $('.container').load('lobby.html',function(){
                    that.model.gameList.on('child_added', function(gameSnapshot){
                        var game = gameSnapshot.val();
                        var key = gameSnapshot.name();
                        if(game.player !== undefined){
                            that.model.enemy = game.player[1].name;
                            that.model.playersArr[1] = that.model.enemy;
                            that.model.playersArr[2] = that.model.name;
                            if($('#'+ key).length == 0){
                                $('.list').append('<div id="'+ key +'">'+game.player[1].name + ' <button class="joinGame">Join Game</button></div>' );
                                $('#'+key + ' .joinGame').click(that.model.joinGame.bind(that.model));
                            }
                        }
                    });
                    that.model.gameList.on('child_removed',function(gameSnapshot){
                        $('.list > #' + gameSnapshot.name()).remove();
                    });

                    $('#you').html($('#you').html() +  that.model.name);
                    $('#startGame').click(that.model.startGame.bind(that.model));
                });
            }
        });
    };


    /**
     *    BIS HIER INS MODEL ÜBERTRAGEN
     */

    //to clear a circle out of the board
    Game.prototype.clearCircle = function clearCircle(ctx, x, y, radius){
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.restore();
    }

    //to overwrite the existing browser function in case of fallback
    window.requestAnimFrame = (function(callback){
       return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame ||
           window.msRequestAnimationFrame ||
           function(callback){
               window.setTimeout(callback, 1000 / 60);
           }
    })();

    //Animate the coin (gravity)
    Game.prototype.animateCoin = function animateCoin(x, y, yEnd, playerid, speed){
        var that = this;
        if(this.isAnimating){
            speed += speed/10;
            if(speed >= 50) speed = 50;
            var y2 = y + speed;
            if(y2 >= yEnd - speed){
                this.isAnimating = false;
                y2 = yEnd;
                if(this.highlight){
                  setTimeout(function(){
                      that.highlightWinner();
                  }, 500);
                }
            }
            window.requestAnimFrame(function(){
                that.animateCoin(x, y2, yEnd, playerid, speed);
            });

            this.drawAnimatedCoin(x, y, y2, playerid);
        }
    };

    //to animate the fall, draws a coin on the new position and clears the old one
    Game.prototype.drawAnimatedCoin = function drawAnimatedCoin(x1, y1, y2, playerid){
        this.clearCircle(this.coinContext, x1, y1, (this.bucketwidth/2));
        this.drawCoin(this.coinContext, x1, y2, (this.bucketwidth/2) - 1, playerid);
    };

    //draw the coin to the given coordinates with the correct color
    Game.prototype.drawCoin = function drawCoin(ctx, x, y, radius, playerid){
        ctx.beginPath();
        ctx.fillStyle = this.colors[playerid];
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
    };

    //Highlight the Winner coins
    Game.prototype.highlightWinner = function highlightWinner(){
        for(var winnerField in this.model.wonFields){
            var x = this.model.wonFields[winnerField].x;
            var y = this.model.wonFields[winnerField].y;
            this.drawCoin(this.coinContext, ((x*this.bucketwidth)+this.bucketwidth/2), ((y*this.bucketheight)+this.bucketheight/2 + 100), (this.bucketwidth/2), 3);
        }
    };

    //draw the board
    Game.prototype.setupField = function setupField() {
        this.context.fillStyle = "#0000CD";
        this.context.fillRect(0, 0, this.width, this.height);
        for(var col = 0; col < 7; col++) {
            for(var row = 0; row<6; row++) {
                this.clearCircle(this.context, ((col*this.bucketwidth)+this.bucketwidth/2), ((row*this.bucketheight)+this.bucketheight/2), ((this.bucketwidth/2) - 1));
            }
        }
    };

    //game setup - sets up canvas, context and eventhandlers
    Game.prototype.setup = function setup(gameRef) {
        console.log("Setup");
        var that = this;
        var canvas = document.getElementById("board");
        var coinCanvas = document.getElementById("coins");
        if (!canvas || !canvas.getContext || !canvas.getContext('2d'))
            $(".container").html("<h2 class='error'>Your Browser does not support HTML5.</h2>");

        this.context = canvas.getContext('2d');
        this.coinContext = coinCanvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.bucketwidth = this.width/7;
        this.bucketheight = this.height/6;

        // if playerId = 1, you start
        this.model.myTurn = this.model.playerId == 1;

        // trigger if some new moves have been added to firebase
        gameRef.child("move").limit(1).on("value", that.model.opponentTurn.bind(that.model));

        //if it's my turn the position of the coin on top gets updated
        $('#board').on('mousemove', function(e){
            if (that.model.myTurn && that.model.playing) {
                var x = Math.floor((e.pageX - $(canvas).offset().left)/100);
                if(x != that.coinPosition && that.coinVisible && that.model.board[x][0] == 0){
                    console.log("Draw my coin");
                    that.clearCircle(that.coinContext, ((that.coinPosition*that.bucketwidth)+that.bucketwidth/2), (that.bucketheight/2), (that.bucketwidth/2));
                    that.coinContext.beginPath();
                    that.coinContext.fillStyle = that.colors[that.model.playerId];
                    that.coinContext.arc(((that.bucketwidth*x) + that.bucketwidth/2), that.bucketheight/2, (that.bucketwidth/2) - 1, 0, 2 * Math.PI, false);
                    that.coinContext.fill();
                    that.coinPosition = x;
                }
            }
        });

        //click event, let the stone fall
        $(canvas).click(function(e) {
           // my turn
           if (that.model.myTurn && that.model.playing) {
               var x = Math.floor((e.pageX - $(canvas).offset().left)/100);
               gameRef.child("move").push({
                   playerId: that.model.playerId,
                   x: x
               });
               var i = 5;
               while(that.model.board[x][i] != 0 && i >= 0){
                   i--;
               }
               if(that.model.board[x][0] == 0){
                   $('h2.title').html("It's not your turn");
                   that.model.board[x][i] = that.model.playerId;
                   that.model.myTurn = false;
                   that.isAnimating = true;
                   //animates the coin fall
                   that.animateCoin((that.bucketwidth*x) + that.bucketwidth/2, that.bucketheight/2, (that.bucketwidth*i) + that.bucketwidth/2 + 100, that.model.playerId, 1);
                   that.coinVisible = false;
                   that.coinPosition = 0;
                   //after every turn the findWinner function gets called
                   that.model.findWinner(x, i);
               }
           } else {
               alert("Its not your turn");
           }
        });

        this.setupField();
    };

    //create an instance of the game
    var theGame = new Game();
});

}(connectFour.CONFIG, connectFour.Model));
