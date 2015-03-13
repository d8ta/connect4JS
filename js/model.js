window.connectFour = window.connectFour || {};

connectFour.Model = (function() {
	"use strict";

	//Model constructor function
	var Model = function Model(config){
		//fills the board with a two dimensional array of 0
		//get the instance of the game
		this.config = config;
		this.board = [];
		//this.init();
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
				this.config.drawCoin(this.config.coinContext, this.config.playfieldWidth/2, this.config.playvieldHeight/2, (this.config.playfieldWidth/2) - 1, this.playerId);
				this.config.coinVisible = true;
				this.myTurn = true;
				var i = 5;
				while(this.board[x][i] != 0 && i >= 0){
					i--;
				}
				//calls the animation function
				if(this.board[x][0] == 0){
					this.board[x][i] = player;
					this.config.isAnimating = true;
					this.config.animateCoin((this.config.playfieldWidth*x) + this.config.playfieldWidth/2, this.config.playvieldHeight/2, (this.config.playfieldWidth*i) + this.config.playfieldWidth/2 + 100, player, 1);
					//after every turn the findWinner function gets called
					this.findWinner(x, i);
				}
			}
		}
		else{
			//draws my next coin on top of the playing field
			if(this.myTurn && this.playing){
				this.config.drawCoin(this.config.coinContext, this.config.playfieldWidth/2, this.config.playvieldHeight/2, (this.config.playfieldWidth/2) - 1, this.playerId);
				this.config.coinVisible = true;
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
							this.config.highlight = true;
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

						that.config.setup(gameRef);
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

						that.config.setup(gameRef);
					}
				});
			}
			else
				$('.container').append('<br><span class="error">You are not connected</span>');
		});
	};


	//static consts
    //
	//Model.EVENTS = {
	//	INIT_COMPLETE: 'initComplete', // after connected to firebase
	//	INSERT_TOKEN: 'insertToken', // drop a piece
	//	GAME_OVER: 'gameOver', // a player wins, pass winning player as event parameter...
	//	GAME_ABORTED: 'gameAborted',
	//	STATE_CHANGE: 'stateChange',
	//	GAME_LIST_CHANGE: 'gameListChange',
	//	ERROR: 'error'
	//	//...
	//};
    //
	//Model.STATES = {
	//	WAITING: 'waiting',
	//	PLAYING: 'playing',
	//	OVER: 'over'
	//};
    //
	////Model prototype
    //
	//Model.prototype = {
    //
	//	//public properties
    //
	//	state: Model.STATES.WAITING,
	//	currentPlayer: '',
	//	myPlayerIndex: '',
	//	columns: null,
	//	gameList: null,
	//	numColumns: 7,
    //
	//	//...
    //
	//	//private properties
    //
	//	_firbase: null,
	//	_gameId: '',
    //
	//	//...
    //
	//	//public functions
    //
	//	init: function () {
	//		this._initColumns();
	//		//connect to firebase and wait for it
	//		//...
	//		//$(this).triggerHandler(Model.EVENTS.INIT_COMPLETE);
	//	},
    //
	//	insertTokenAt: function (columnIndex) {
	//		return this.columns[columnIndex].length < this.config.numRows;
	//	},
    //
	//	isInsertTokenPossibleAt: function (columnIndex) {
	//		return true;
	//	},
    //
	//	toString: function () {
	//		var s = '';
	//		for (var row = 0; row < this.config.numRows; row++) {
	//			var line = '';
	//			for (var col = 0; col < this.config.numColumns; col++) {
	//				var elem = this.columns[col][row];
	//				line += (elem === undefined ? '-' : elem) + ' ';
	//			}
	//			s = line + '\n' + s;
	//		}
	//		return '\n' + s;
	//	},
    //
	//	startGame: function () {
	//		//create new game and wait for user
	//	},
    //
	//	joinGame: function (gameId) {
	//		//try to join an existing game
	//	},
    //
	//	//...
    //
	//	//private functions
    //
	//	_initColumns: function () {
	//		this.columns = [];
	//		for(var i = 0; i < this.config.numColumns; i++)
	//			this.columns[i] = [];
	//	}
    //
	//	//...
    //
	//};

	return Model;
})();