window.connectFour = window.connectFour || {};

connectFour.config = (function(config, Model) {
    "use strict";

    var Game = function Game(){
        // instance of the Model for the Game
        this.model = new Model(this);
        this.context;
        this.coinContext;
        this.width;
        this.height;
        this.playfieldWidth;
        this.playvieldHeight;

        // arrys for playercolors
        this.colors = [];
        this.colors[1] = "#f00";
        this.colors[2] = "#ff0";
        this.colors[3] = "#00fcff";

        // shows coin above the playfield
        this.coinVisible = false;
        this.coinPosition = 0;
        this.isAnimating = false;

        // highlighting the winnerstones
        this.highlight = false;

        // setting another scope
        var that = this;

        //saves the Name from the #saveName Field
        $('#saveName').click(function(){
            that.model.name = $('#inputGameId').val();
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
            //}
        });
    };


    /**
     *    BIS HIER INS MODEL ÜBERTRAGEN
     */

    //to clear a circle out of the board
    Game.prototype.clearCircle = function clearCircle(context, x, y, radius){
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fill();
        context.restore();
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
        this.clearCircle(this.coinContext, x1, y1, (this.playfieldWidth/2));
        this.drawCoin(this.coinContext, x1, y2, (this.playfieldWidth/2) - 1, playerid);
    };

    //draw the coin to the given coordinates with the correct color
    Game.prototype.drawCoin = function drawCoin(context, x, y, radius, playerid){
        context.beginPath();
        context.fillStyle = this.colors[playerid];
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fill();
    };

    //Highlight the Winner coins
    Game.prototype.highlightWinner = function highlightWinner(){
        for(var winnerField in this.model.wonFields){
            var x = this.model.wonFields[winnerField].x;
            var y = this.model.wonFields[winnerField].y;
            this.drawCoin(this.coinContext, ((x*this.playfieldWidth)+this.playfieldWidth/2), ((y*this.playvieldHeight)+this.playvieldHeight/2 + 100), (this.playfieldWidth/2), 3);
        }
    };

    //draw the board
    Game.prototype.setupField = function setupField() {
        this.context.fillStyle = "#0000CD";
        this.context.fillRect(0, 0, this.width, this.height);
        for(var col = 0; col < 7; col++) {
            for(var row = 0; row<6; row++) {
                this.clearCircle(this.context, ((col*this.playfieldWidth)+this.playfieldWidth/2), ((row*this.playvieldHeight)+this.playvieldHeight/2), ((this.playfieldWidth/2) - 1));
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
            $(".container").html("<h2 class='error'>Your Browser does not support HTML5</h2>");

        this.context = canvas.getContext('2d');
        this.coinContext = coinCanvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.playfieldWidth = this.width/7;
        this.playvieldHeight = this.height/6;

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
                    that.clearCircle(that.coinContext, ((that.coinPosition*that.playfieldWidth)+that.playfieldWidth/2), (that.playvieldHeight/2), (that.playfieldWidth/2));
                    that.coinContext.beginPath();
                    that.coinContext.fillStyle = that.colors[that.model.playerId];
                    that.coinContext.arc(((that.playfieldWidth*x) + that.playfieldWidth/2), that.playvieldHeight/2, (that.playfieldWidth/2) - 1, 0, 2 * Math.PI, false);
                    that.coinContext.fill();
                    that.coinPosition = x;
                }
            }
        });

        // mouseevent for letting the coins fall
        $(canvas).click(function(e) {
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
                   that.animateCoin((that.playfieldWidth*x) + that.playfieldWidth/2, that.playvieldHeight/2, (that.playfieldWidth*i) + that.playfieldWidth/2 + 100, that.model.playerId, 1);
                   that.coinVisible = false;
                   that.coinPosition = 0;
                   // call to evaluate if one of the players have won
                   that.model.findWinner(x, i);
               }
           } else {
               alert("not your turn");
           }
        });

        this.setupField();
    };

    // new instance for the Game
    var connectFour = new Game();

}(connectFour.CONFIG, connectFour.Model));
