window.connectFour = window.connectFour || {};

connectFour.config = function (config, Model) {
    "use strict";

    var Game = function Game() {
        // instance of the Model for the Game
        this.model = new Model(this);
        this.context;
        this.coinContext;
        this.width;
        this.height;
        this.playfieldW;
        this.playfieldH;

        // arrys for playercolors
        this.colors = [];
        this.colors[1] = "cornflowerblue";
        this.colors[2] = "palevioletred";
        this.colors[3] = "greenyellow";

        // shows coin above the playfield
        this.coinVisibility = false;
        this.coinPos = 0;
        this.isAnimating = false;

        // highlighting the winnerstones
        this.highlight = false;

        // setting another scope
        var that = this;

        //saves the Name from the #saveName Field
        $('#saveName').click(function () {
            that.model.name = $('#inputGameId').val();
            $('.container').load('lobby.html', function () {
                that.model.gameList.on('child_added', function (gameSnapshot) {
                    var game = gameSnapshot.val();
                    var key = gameSnapshot.name();
                    if (game.player !== undefined) {
                        that.model.enemy = game.player[1].name;
                        that.model.playersArr[1] = that.model.enemy;
                        that.model.playersArr[2] = that.model.name;
                        if ($('#' + key).length == 0) {
                            $('.list').append('<div id="' + key + '">' + game.player[1].name + ' <button class="joinGame">Join Game</button></div>');
                            $('#' + key + ' .joinGame').click(that.model.joinGame.bind(that.model));
                        }
                    }
                });
                that.model.gameList.on('child_removed', function (gameSnapshot) {
                    $('.list > #' + gameSnapshot.name()).remove();
                });

                // shows name in the lobby.html with playername
                $('#you').html($('#you').html() + that.model.name);
                $('#startGame').click(that.model.startGame.bind(that.model));
            });
            //}
        });
    };
        // clears circles
    Game.prototype.clearCircle = function clearCircle(context, x, y, radius) {
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fill();
        context.restore();
    }

    // callback overwrite
    window.requestAnimationFrame = (function (callback) {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            }
    })();

    // Coingravitation (internetsource)
    Game.prototype.coinAnimation = function coinAnimation(x, y, yEnd, playerid, speed) {
        var that = this;
        if (this.isAnimating) {
            speed += speed / 10;
            if (speed >= 50) speed = 50;
            var y2 = y + speed;
            if (y2 >= yEnd - speed) {
                this.isAnimating = false;
                y2 = yEnd;
                if (this.highlight) {
                    setTimeout(function () {
                        that.highlightWinner();
                    }, 500);
                }
            }
            window.requestAnimationFrame(function () {
                that.coinAnimation(x, y2, yEnd, playerid, speed);
            });

            this.drawCoinAnimation(x, y, y2, playerid);
        }
    };

    // draws coin to new position and clears old on
    Game.prototype.drawCoinAnimation = function drawCoinAnimation(x1, y1, y2, playerid) {
        this.clearCircle(this.coinContext, x1, y1, (this.playfieldW / 2));
        this.drawCoin(this.coinContext, x1, y2, (this.playfieldW / 2) - 1, playerid);
    };

    // draws coin to given position
    Game.prototype.drawCoin = function drawCoin(context, x, y, radius, playerid) {
        context.beginPath();
        context.fillStyle = this.colors[playerid];
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fill();
    };

    // the 4 winning stones gets highlighted
    Game.prototype.highlightWinner = function highlightWinner() {
        for (var winnerField in this.model.wonFields) {
            var x = this.model.wonFields[winnerField].x;
            var y = this.model.wonFields[winnerField].y;
            this.drawCoin(this.coinContext, ((x * this.playfieldW) + this.playfieldW / 2), ((y * this.playfieldH) + this.playfieldH / 2 + 100), (this.playfieldW / 2), 3);
        }
    };

    // drawing the gameboard
    Game.prototype.gameBoard = function gameBoard() {
        this.context.fillStyle = "#0000CD";
        this.context.fillRect(0, 0, this.width, this.height);
        for (var col = 0; col < 7; col++) {
            for (var row = 0; row < 6; row++) {
                this.clearCircle(this.context, ((col * this.playfieldW) + this.playfieldW / 2), ((row * this.playfieldH) + this.playfieldH / 2), ((this.playfieldW / 2) - 1));
            }
        }
    };

    // setting up the gamecomponents
    Game.prototype.gameSetup = function gameSetup(gameReference) {
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
        this.playfieldW = this.width / 7;
        this.playfieldH = this.height / 6;

        // if playerId = 1, you start
        this.model.myTurn = this.model.playerId == 1;

        // trigger if some new moves have been added to firebase
        gameReference.child("move").limit(1).on("value", that.model.opponentTurn.bind(that.model));

        //if it's my turn the position of the coin on top gets updated
        $('#board').on('mousemove', function (e) {
            if (that.model.myTurn && that.model.playing) {
                var x = Math.floor((e.pageX - $(canvas).offset().left) / 100);
                if (x != that.coinPos && that.coinVisibility && that.model.board[x][0] == 0) {
                    console.log("Draw my coin");
                    that.clearCircle(that.coinContext, ((that.coinPos * that.playfieldW) + that.playfieldW / 2), (that.playfieldH / 2), (that.playfieldW / 2));
                    that.coinContext.beginPath();
                    that.coinContext.fillStyle = that.colors[that.model.playerId];
                    that.coinContext.arc(((that.playfieldW * x) + that.playfieldW / 2), that.playfieldH / 2, (that.playfieldW / 2) - 1, 0, 2 * Math.PI, false);
                    that.coinContext.fill();
                    that.coinPos = x;
                }
            }
        });

        // mouseevent for letting the coins fall
        $(canvas).click(function (e) {
            if (that.model.myTurn && that.model.playing) {
                var x = Math.floor((e.pageX - $(canvas).offset().left) / 100);
                gameReference.child("move").push({
                    playerId: that.model.playerId,
                    x: x
                });
                var i = 5;
                while (that.model.board[x][i] != 0 && i >= 0) {
                    i--;
                }
                if (that.model.board[x][0] == 0) {
                    $('h2.title').html("It's not your turn");
                    that.model.board[x][i] = that.model.playerId;
                    that.model.myTurn = false;
                    that.isAnimating = true;
                    //animates the coin fall
                    that.coinAnimation((that.playfieldW * x) + that.playfieldW / 2, that.playfieldH / 2, (that.playfieldW * i) + that.playfieldW / 2 + 100, that.model.playerId, 1);
                    that.coinVisibility = false;
                    that.coinPos = 0;

                    // call to evaluate if one of the players have won
                    that.model.winner(x, i);
                }
            } else {
                alert("not your turn");
            }
        });

        this.gameBoard();
    };

    // new instance for the Game
    var connectFour = new Game();

}(connectFour.CONFIG, connectFour.Model);
