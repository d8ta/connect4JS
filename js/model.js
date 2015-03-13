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