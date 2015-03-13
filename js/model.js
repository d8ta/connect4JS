window.connectFour = window.connectFour || {};

connectFour.Model = (function() {
	"use strict";

	// Model constructor
	var Model = function Model(config){
		this.config = config;
		this.board = [];

		// two dim. arry for the board
		for(var i = 0; i < 7; i++){
			this.board[i] = [];
			for(var j = 0; j < 6; j++){
				this.board[i][j] = 0;
			}
		}

		// connects to firebase
		this.FIREBASE_URL = 'https://shining-inferno-3227.firebaseio.com';
		this.connectionRef = new Firebase(this.FIREBASE_URL + '/.info/connected');
		this.gameList = new Firebase(this.FIREBASE_URL + '/games');


		this.name;
		this.playerId;
		this.enemy;
		this.myTurn = false;
		this.start = false;

		// indicates if game is running, is fals if game ends
		this.playing = true;

		//array with the winner fields
		this.winnerFields = [];
		this.wonFields = [];
		this.playersArr = [];
	};


	// second player turn
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

				// shows coin above the field if it is my turn
				this.config.drawCoin(this.config.coinContext, this.config.playfieldWidth/2, this.config.playfieldHeight/2, (this.config.playfieldWidth/2) - 1, this.playerId);
				this.config.coinVisible = true;
				this.myTurn = true;
				var i = 5;
				while(this.board[x][i] != 0 && i >= 0){
					i--;
				}

				// animation for coins
				if(this.board[x][0] == 0){
					this.board[x][i] = player;
					this.config.isAnimating = true;
					this.config.coinAnimation((this.config.playfieldWidth*x) + this.config.playfieldWidth/2, this.config.playfieldHeight/2, (this.config.playfieldWidth*i) + this.config.playfieldWidth/2 + 100, player, 1);

					// called after every turn to check if game has still a winner
					this.winner(x, i);
				}
			}
		}
		else{
			if(this.myTurn && this.playing){
				this.config.drawCoin(this.config.coinContext, this.config.playfieldWidth/2, this.config.playfieldHeight/2, (this.config.playfieldWidth/2) - 1, this.playerId);
				this.config.coinVisible = true;
			}
		}
		this.start = true;
	};


	// if game is full the game is draw
	Model.prototype.draw = function draw(){
		var full = true;
		for(var i = 0; i < 7; i++){
			for(var j = 0; j < 6; j++){
				if(this.board[i][j] == 0) full = false;
			}
		}
		return full;
	}

	// checks for a winner
	Model.prototype.winner = function winner(x, y){
		//checks if the game ends in a draw
		var exitDraw = this.draw();

		if(this.board[x][y] != 0){
			for(var i=-1; i<2; i++){
				for(var j=-1; j<2; j++){
					if((i!=0 || j!=0) && (x+i)<7 && (x+i)>=0 && (y+j)<6 && (y+j)>=0){
						var depth = 1;
						this.winnerFields = [];
						this.winnerFields.push({'x': x, 'y': y});
						depth += this.winnerDirection(x, y, i, j);
						depth += this.winnerDirection(x, y, -i, -j);
						if(depth >= 4){
							this.wonFields = this.winnerFields;
							this.config.highlight = true;
							this.playing = false;
							$('h2.title').html(this.playersArr[this.board[x][y]] + " wins!");
						}
						if(exitDraw){
							this.playing = false;
							$('h2.title').html("Game is a Draw");
						}
					}
				}
			}
		}
	}

	//this function checks if there are coins with the same color in a given direction
	Model.prototype.winnerDirection = function winnerDirection(x, y, gox, goy){
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

	// Join the game
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
						});
						that.playerId = 2;

						$('h2.title').html("It's not your turn");

						that.config.setup(gameRef);
					}
				});
			}
		});
	}



	// start the Game with Firebase
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

						that.config.setup(gameRef);
					}
				});
			}
			else
				$('.container').append('<br><span class="error">You are not connected</span>');
		});
	};

	return Model;
})();