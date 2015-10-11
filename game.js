/**
 * @file game.js
 * @brief Represents the game world and all Entities within it
 */
 
function Debug(message)
{
	//console.log(message);
	try
	{
		document.getElementById("debug").innerHTML = message;
	}
	catch (err)
	{
		
	}
}
 
/**
 * Wrapper class for pausable timeouts associated with a Game
 */
function Timeout(name, onTimeout, wait, game)
{
	if (game.timeouts[name])
	{
		game.timeouts[name].Pause();
		delete game.timeouts[name];
	}
	
	this.name = name;
	this.onTimeout = onTimeout;
	this.id = setTimeout(function(game) {
		this.onTimeout(); 
		delete game.timeouts[this.name]}.bind(this,game), wait);
	game.timeouts[this.name] = this;

	this.wait = wait;
	this.start = (new Date()).getTime();
	this.running = true;
	this.game = game;
}
/**
 * Pause timeout
 */
Timeout.prototype.Pause = function()
{
	if (!this.running)
		return;
	this.running = false;
	this.wait -= (new Date()).getTime() - this.start;
	clearTimeout(this.id);
	
	//console.log("Pause <" + this.name + "> timeout with " + String(this.wait) + "ms left");
	this.wait = Math.max(this.wait, 0);
	
}

/**
 * Resume timeout
 */
Timeout.prototype.Resume = function()
{
	if (this.running)
		return;

	this.running = true;
	//console.log("Timeout <" + this.name + "> resumed with " + String(this.wait) + " ms remaining");
	this.id = setTimeout(function(game) {
		this.onTimeout(); 
		delete game.timeouts[this.name]}.bind(this,this.game), this.wait);
}
Timeout.prototype.constructor = Timeout;


/**
 * Game class
 * @param canvas - HTML5 canvas element to render into
 * @param audio - HTML5 audio element to use for sound
 * @param document - The webpage DOM
 */
function Game(canvas, audio, document, multiplayer)
{
	Debug("Construct Game");
	this.document = document;
	this.audio = audio;
	this.level = -1;
	// If true, "advertising" spash screens are shown every time a level starts/restarts
	this.enableAdverts = true; // Will be set to false if necessary in main()
	this.ChooseAdvert(); // First call will get the list of adverts
	
	// Hacks to keep track of level durations
	// Needed because some devices won't play audio so we have to check the time ourselves
	//  instead of using a "ended" event listener.
	// Level 0 is the tutorial and doesn't end at a specified time depending on player speed
	this.levelDurations = [null, 198000,150000,210000,165000,2480000];
	this.backgrounds = ["data/backgrounds/forest1_cropped.jpg", 
		"data/backgrounds/flowers2.jpg", 
		"data/backgrounds/forest1_cropped.jpg", 
		"data/backgrounds/dark1.jpg", 
		"data/backgrounds/forest1_cropped.jpg",
		"data/backgrounds/forest1_cropped.jpg"]
	
	this.localTime = new Date();
	this.canvas = new Canvas(canvas); // Construct Canvas class on the HTML5 canvas
	if (this.spriteCollisions)
		this.canvas.prepareSpriteCollisions = true; // unused will probably break things
		
	this.gravity = [0, 0]; // gravity!
	this.stepRate = 20; // Time we would ideally have between steps in ms (lol setTimeout)
	
	this.timeouts = {}; // Timeouts
	
	this.mouseX = 0;
	this.mouseY = 0;
	
	this.running = false;
	this.runTime = 0;
	this.entities = [];
	this.playedTutorial = false;
	
	this.webSockets = [];
	this.multiplayer = multiplayer;
	if (this.multiplayer)
	{
		Debug("Open WebSocket Connection");
		var con = new WebSocket("ws://localhost:7681", "ws");
		con.onopen = function() {console.log("Connected to WebSocket")}
		con.onclose = function(e) {console.log("Closed WebSocket sesame"); console.log(e.reason);}
		con.onerror = function(e) {console.log("WebSocket Error"); console.log(e); console.log(String(e));}
		con.onmessage = function(e) {this.MultiplayerSync(e.data);}.bind(this); // didn't want to use a global here :(
		this.webSockets.push(con);
	}
	this.playerCount = 1;
	Debug("Constructed Game");
}


Game.prototype.AddTimeout = function(name, onTimeout, wait)
{
	if (!this.timeouts)
		this.timeouts = {};
	new Timeout(name, onTimeout, wait, this);
}

Game.prototype.Pause = function(message,image	, colour)
{
	delete this.stepTime;
	this.running = false;
	for (var t in this.timeouts)
	{
		this.timeouts[t].Pause();
	}
	if (this.audio && typeof(this.audio.pause) === "function")
		this.audio.pause();
		
	this.Draw();
	this.UpdateDOM(this.player);
	
	if (message === null || image === null)
		return;
	
	if (typeof(image) === "undefined")
		image = "data/rabbit/drawing2.svg";
	if (typeof(colour) === "undefined")
		colour = [1,1,1,1];
	this.canvas.SplashScreen(image, message, colour);
}


Game.prototype.Resume = function()
{
	if (this.running)
		return;
		
	this.canvas.cancelSplash = true;
		
	this.UpdateDOM(this.player);
	

	this.running = true;
	
	for (var t in this.timeouts)
	{
		this.timeouts[t].Resume();
	}
	
	if (this.audio)
		this.audio.play();
		
		
	if (typeof(this.timeouts["MainLoop"]) === "undefined")
		this.MainLoop();
		
	if (this.level > 0)
	{
		if (typeof(this.timeouts["AddEnemy"]) === "undefined")
			this.AddTimeout("AddEnemy", function() {this.AddEnemy()}.bind(this), this.stepRate*600);
		
		if (typeof(this.timeouts["AddCloud"]) === "undefined")
		{
			//this.AddTimeout("AddCloud", function() {this.AddCloud()}.bind(this), this.stepRate*(1000 + Math.random()*2000));	
			
		}
		
		
		if (!this.running) 
		{
			this.timeouts["AddCloud"].Pause();	
			this.timeouts["AddEnemy"].Pause();
		}
	}
	this.canvas.Clear(this.GetColour());
	

}

Game.prototype.Start = function(level)
{
	this.level = level-1;
	this.NextLevel();
}

Game.prototype.SetLevel = function(level)
{
	Debug("Set level " + String(level));
	this.level = Math.min(level,5);
	
	// hooray globals
	if (typeof(g_maxLevelCookie) != "undefined")
	{
		if (g_maxLevelCookie < this.level)
		{
			g_maxLevelCookie = this.level;
			SetCookie("maxLevel", g_maxLevelCookie);
		}
	}
		
	this.spawnedEnemies = 0;
	if (this.audio)
	{
		if (this.romanticMode === true)
			this.audio.src = "data/romanticmode.ogg";
		else if (this.xmasMode === true && this.level === 1)
			this.audio.src = "data/xmasmode.ogg";
		else
			this.audio.src = "data/theme"+this.level+".ogg";
		this.audio.load();
		this.audio.pause();
		//this.audio.play();
		
		//this.levelDurations[this.level] = this.audio.duration*1000;
	}
	
	delete this.stepTime;
	this.runTime = 0;
	this.stepCount = 0;
	this.keyState = [];
	
	this.entities = [];
	for (var t in this.timeouts)
	{

		this.timeouts[t].Pause();
		delete this.timeouts[t];
	}
	this.timeouts = {};
	this.entityCount = {};
	this.deathCount = {};

	// Add the walls
	this.AddEntity(new Wall({min: [-Infinity,-Infinity], max:[Infinity, -0.7]}, "Floor")); // bottom
	this.AddEntity(new Wall({min: [-Infinity,0.7], max:[Infinity,Infinity]}, "Roof")); // top
	this.AddEntity(new Wall({min: [-Infinity,-Infinity], max:[-0.7, Infinity]})); // left 
	this.AddEntity(new Wall({min: [0.7,-Infinity], max:[Infinity, Infinity]})); // right
	
	// Add the player
	this.player = new Player([0,0],[0,0],this.gravity, this.canvas, "data/player");
	this.AddEntity(this.player);
	
	//var enemy = new PurpleEater([0.5,0.5],[0,0],this.gravity, this.canvas);
	//this.AddEntity(enemy);
	

	/**  level specific code goes below here **/	
	
	this.canvas.SetBackground(this.backgrounds[this.level]);

	Debug("Created level");
}

/** Get background draw colour (in OpenGL RGBA) **/
Game.prototype.GetColour = function()
{
	return [0,0,0,1];
}

/** 
 * Pick an advert to show; on the first call it will HTTP GET the list of adverts
 * @param trial - Used to stop recursion
 */
Game.prototype.ChooseAdvert = function(trial)
{
	Debug("Choose advert");
	if (!this.advertChoices)
	{
		if (trial)
			return;
		HttpGet("adverts.py", function(response) {
			try
			{
				this.advertChoices = JSON.parse(response);
				this.advertChoiceIndex = -1;
				this.ChooseAdvert(true);
			}
			catch (err)
			{
				this.ChooseAdvert(true);
			}
		}.bind(this));
		return;
	}
	// Go through the adverts in order (order is chosen by the server in adverts.py)
	return this.advertChoices[this.advertChoiceIndex++ % this.advertChoices.length];
	
}

/**
 * Progress to the Next Level
 * @param skipAd - Used to prevent recursion
 */
Game.prototype.NextLevel = function(skipAd)
{
	this.Pause("Loading...");
	

	
	if (this.enableAdverts && !skipAd)
	{
		// Make the splash screen then call NextLevel (with the skipAd flag
		//	to prevent recursing infinitely)
		this.canvas.SplashScreen(this.ChooseAdvert(), "",[1,1,1,1], function() {
			this.AddTimeout("Advert", this.NextLevel.bind(this,true), 4000);
		}.bind(this));
		return;
	}
	this.SetLevel(this.level+1);
	
	this.Clear();
	this.Draw();

	this.Resume();
	

	
}

/**
 * Add an Enemy and then set a timeout to call AddEnemy again
 * This should only be called once at the start of a level
 */
Game.prototype.AddEnemy = function()
{

	this.AddEntity(new GreyShooter([Math.random()*2-1,Math.random()*2-1],[0,0],this.gravity, this.canvas));
	this.AddTimeout("AddEnemy", function() {this.AddEnemy()}.bind(this), this.stepRate*300/Math.min(Math.pow(this.level,0.5),1));
	if (!this.running)
		this.timeouts["AddEnemy"].Pause();
	

}


/**
 * Add an Entity; optimises use of this.entities array
 */
Game.prototype.AddEntity = function(entity)
{
	for (var i = 0; i < this.entities.length; ++i)
	{
		if (!this.entities[i])
		{
			this.entities[i] = entity;
			return;
		}
	}
	if (!this.entityCount[entity.GetName()])
	{
		this.entityCount[entity.GetName()] = 1;
	}
	else
	{
		this.entityCount[entity.GetName()] += 1;
	}
	this.entities.push(entity);
	return entity;
}

/**
 * Key was pressed
 * Warning: Magic keycode numbers incoming
 */
Game.prototype.KeyDown = function(event)
{
	if (!this.keyState)
		this.keyState = [];
		
	if (this.keyState[event.keyCode] === true) 
		return;
	this.keyState[event.keyCode] = true; 

	if (event.keyCode == 32) // space
	{
		if (this.running)
		{
			this.Pause("Paused");
			this.playerPaused = this.playerID;
			this.Message("Focus tab, press any key");
		}
		else if (this.player && this.player.alive)
		{
			if (this.playerPaused == this.playerID)
			{
				this.Resume();
				this.Message("");
			}
		}
	}
	if (event.keyCode >= 48 && event.keyCode <= 53)
	{
		this.SetLevel(event.keyCode-48);
	}
	
	if (!this.webSockets)
		return;
	
	for (var i = 0; i < this.webSockets.length; ++i)
	{
		this.webSockets[i].send("+"+event.keyCode+"\n");
	}
}

/**
 * Key was released
 */
Game.prototype.KeyUp = function(event)
{
	if (!this.keyState)
		this.keyState = [];
	
	if (this.keyState[event.keyCode] !== true)
		return;
		
	this.keyState[event.keyCode] = false;
	if (!this.webSockets)
		return;
	for (var i = 0; i < this.webSockets.length; ++i)
	{
		this.webSockets[i].send("-"+event.keyCode+"\n");
	}	
}


Game.prototype.TouchDown = function(event)
{
	if (!this.running && this.player && this.player.alive
		&& (!this.multiplayer || this.multiplayer.length <= 1))
	{
		this.Resume();
	}
	
	if (this.player.canShoot)
	{
		var v = 1;
		var theta = Math.atan2(-this.mouseY + this.player.position[1], this.mouseX - this.player.position[0]);
		var vx = v * Math.cos(theta);
		var vy = -v * Math.sin(theta);
		Debug("Shot fired");
		this.AddEntity(new PlayerShot([this.player.position[0],this.player.position[1]], [vx,vy], [0,0], this.canvas, this));
		this.player.canShoot = false;
		this.AddTimeout("canShoot", function() {this.player.canShoot = true;}.bind(this), 100);
	}
	return;
	
	this.keyState = [];
	if (!this.player || !this.canvas)
		return;
	//alert("TouchDown at "+String(event.clientX) +","+String(event.clientY));
	var delx = ((2*event.clientX/this.canvas.width)-1) - this.player.position[0];
	var dely = (1-2*(event.clientY/this.canvas.height)) - this.player.position[1];
	// note y coordinate positive direction is reversed in GL (game) coords vs canvas coords
	//this.Message("TouchDown "+String(delx)+","+String(dely));
	if (delx >= 2*this.player.Width() || event.clientX > 0.8*this.canvas.width)
	{
		this.KeyDown({keyCode : 39});
	}
	else if (delx <= -1.5*this.player.Width() || event.clientX < 0.2*this.canvas.width)
	{
		this.KeyDown({keyCode : 37});
	}
	
	if (dely >= 3*this.player.Height() || event.clientY < 0.2*this.canvas.height)
	{
		this.KeyDown({keyCode : 38});
	}
	else if (dely <= -3*this.player.Height() || event.clientY > 0.8*this.canvas.height)
	{
		this.KeyDown({keyCode : 40});
	}
}

/**
 * Touch is released
 */
Game.prototype.TouchUp = function(event)
{
	//this.Message("TouchUp at "+String([event.clientX, event.clientY]));
	return;
	for (var k in this.keyState)
	{
		this.KeyUp({keyCode : k});
	}
	this.keyState = [];
}

/**
 * Mouse is clicked inside the canvas
 */
Game.prototype.MouseDown = function(event)
{
	this.mouseDown = true;
	this.TouchDown(event);
}

/**
 * Mouse is released
 * Buggy - doesn't get called if mouse is released outside of the canvas
 */
Game.prototype.MouseUp = function(event)
{
	if (this.mouseDown)
	{
		this.mouseDown = false;
		this.TouchUp(event);
	}
}

/**
 * Mouse got moved
 */
Game.prototype.MouseMove = function(event)
{
	if (this.mouseDown)
		this.TouchDown(event);
	this.mouse = this.canvas.LocationPixToGL(event.pageX, event.pageY);
	this.mouseX = this.mouse[0];
	this.mouseY = this.mouse[1];
	//Debug("Mouse at " +this.mouseX+","+this.mouseY + "Player at "+this.player.position[0]+","+this.player.position[1]);
}

/**
 * Combine clearing, steping and drawing into one function
 * More efficient than using three
 */
Game.prototype.ClearStepAndDraw = function()
{

	//Debug("Step");
	this.lastStepTime = this.stepTime;
	this.stepTime = (new Date()).getTime();
	if (!this.lastStepTime)
	{
		this.startTime = this.stepTime;
		this.runTime += this.stepRate/1000;
	}
	else
	{
		this.runTime += this.stepTime - this.lastStepTime;
	}

	// If using Entity.Clear in the loop this should be commented out
	//  to give a performance increase
	this.canvas.Clear(this.GetColour());
	this.canvas.DrawBackground();
	
	this.canvas.ctx.beginPath();
	this.canvas.ctx.strokeStyle = "#FF0000";
	this.canvas.ctx.moveTo(-0.7,0.7);
	this.canvas.ctx.lineTo(-0.7,-0.7);
	this.canvas.ctx.lineTo(0.7,-0.7);
	this.canvas.ctx.lineTo(0.7,0.7);
	this.canvas.ctx.lineTo(-0.7,0.7);
	this.canvas.ctx.stroke();
	
		
	if (this.message)
	{
		this.canvas.Text(this.message);	
	}

	
	for (var i = this.entities.length; i >= 0; --i)
	{
		if (this.entities[i])
		{
			 // noticably faster on smartphone, but obviously causes issues with overlapping objects :(
			//this.entities[i].Clear(this.canvas);
			
			// Hacky - use different key states when in multiplayer
			if (this.entities[i].name == "Humphrey" && this.multiplayerKeyState)
			{
				//console.log("Multiplayer; load key state for "+String(this.playerID));
				this.oldKeyState = this.keyState;
				this.keyState = this.multiplayerKeyState[this.entities[i].playerID];	
				this.entities[i].Step(this);
				this.keyState = this.oldKeyState;		
			}
			else
			{
				this.entities[i].Step(this);
				//if (this.entities[i].angle != 0)
				//	console.log("Angle is " + String(this.entities[i].angle));
			}
			this.entities[i].Draw(this.canvas);
			if (!this.entities[i].alive)
			{
				this.entities[i].Clear(this.canvas);
				this.entityCount[this.entities[i].GetName()] -= 1;
				if (!this.deathCount[this.entities[i].GetName()])
				{
					this.deathCount[this.entities[i].GetName()] = 1;
				}
				else
				{
					this.deathCount[this.entities[i].GetName()] += 1;
				}
				if (this.entities[i] !== this.player)
					delete this.entities[i];
			}
		}
	}
	
	this.stepCount += 1;
	//Debug(String(this.player.angle));
}

/** Clear the canvas, defaults to this.canvas **/
Game.prototype.Clear = function(canvas)
{
	if (!canvas)
		canvas = this.canvas;
	
	//if (canvas.gl)
	{
		canvas.Clear()
		return;
	}
	for (var i = 0; i < this.entities.length; ++i)
	{
		if (this.entities[i] && this.entities[i].alive)
			this.entities[i].Clear(canvas);
	}
}

/** Draw **/
Game.prototype.Draw = function()
{
	
	if (this.message)
	{
		this.canvas.Clear(this.GetColour());
		this.canvas.Text(this.message);
		//this.canvas.SplashScreen(this.overlay.image, this.overlay.splashText, [0,0,0,0.1]);
	}
	

	/*
	for (var i = 0; i < this.entities.length; ++i)
	{
		if (this.entities[i])
		{
			this.entities[i].Draw(this.canvas);
		}
	}
	*/
	
}

Game.prototype.MainLoop = function()
{	
	
	if (!this.running)
		return;
		
	if (this.document && (!this.document.hasFocus() && (!this.multiplayer || this.multiplayer.length <= 1)))
	{
		this.Pause("Paused");
		this.Message("Focus tab and press space");
		return;
	}
	
	
	if (this.levelDurations[this.level] && 
		this.runTime > this.levelDurations[this.level])
	{
		if (this.player)
			this.player.PostStats("Next Level",this)
		this.NextLevel();
		return;
	}
	
		
			
	this.ClearStepAndDraw();
	
	if (this.player && !this.player.alive && !this.player.alreadyDying)
	{
		this.player.alreadyDying = true;
		if (this.audio)
			this.audio.pause();
		this.Clear();
		this.Draw();
		this.player.Draw(this.canvas);
		
		this.running = false;
		
		for (var t in this.timeouts)
		{
			this.timeouts[t].Pause();
			delete this.timeouts[t];
		}
		
		var deathCall;
		// horrible callback code follows
		// (seriously why isn't there a sleep() function
		//	 don't give me that crap about callbacks being more elegant)
		if (!this.enableAdverts)
		{
			deathCall = function() {
				this.AddTimeout("Restart", function() {
					this.SetLevel(this.level);
					this.Resume();
				}.bind(this),1000);
			}
		}
		else
		{
			deathCall = function() {
				this.AddTimeout("Advert", function() {
					this.canvas.SplashScreen(this.ChooseAdvert(), "",[1,1,1,1], 
					function() {
							this.AddTimeout("Restart", function() {
							this.SetLevel(this.level);
							this.Resume();
						}.bind(this),4000);
					}.bind(this));
				}.bind(this), 1000);
			}
		}
		
		//if (this.level == 1 && !this.playedTutorial && (!this.spawnCount || this.spawnCount <= 10))
		//{
		//	this.level = -1;
		//	this.NextLevel();
		//	return;
		//}
		
		this.player.DeathScene(this, deathCall.bind(this));
		this.player.alreadyDying = false;
		return;
	}
	
	if (this.document)
	{
		if (!this.document.runtime)
			this.document.runtime = this.document.getElementById("runtime");
		if (!this.document.level)
			this.document.level = this.document.getElementById("level");
		if (this.document.level)
		{
			this.document.level.innerHTML = String(this.level);
		}
		if (this.document.runtime)
		{
			var totalTime = this.runTime;
			for (var i = 1; i < this.level; ++i)
				totalTime += this.levelDurations[i];
			this.document.runtime.innerHTML = (""+totalTime/1000).toHHMMSS();
		}
	}
	
	var actualTime = 0;
	var thisLoop = (new Date()).getTime();
	if (this.lastLoop)
	{
		actualTime = thisLoop - this.lastLoop;
	}
	this.lastLoop = thisLoop;
	
	
	var nextTime = Math.max(0, this.stepRate - actualTime);
	this.AddTimeout("MainLoop", function() {
		this.MainLoop()
	}.bind(this), nextTime, this);	
}

Game.prototype.GetNearestPlayer = function(position)
{
	// Maybe one day I will have more than one player...
	return this.player;
}

Game.prototype.Message = function(text, timeout)
{
	if (!this.document)
		return;
	if (!this.document.message)
		this.document.message = this.document.getElementById("message");
	if (!this.document.message)
	{
		this.canvas.Message(text);
	}
	else
	{
		this.document.message.innerHTML = text;
	}
	if (timeout)
	{
		this.AddTimeout("Message Clear", function() {
			this.Message("")}.bind(this), timeout);
	}
}

Game.prototype.UpdateDOM = function(player)
{
	if (!this.document || !player)
		return;
		
	if (!this.document.lives)
		this.document.lives = this.document.getElementById("lives");
	if (!this.document.lives)
		return;
		
	this.document.lives.innerHTML = player.lives;
	if (player.lives <= 0)
	{
		this.document.lives.style.color = "red";
	}
	else
	{
		this.document.lives.style.color = "green";
	}
}

Game.prototype.GetTargetPlayer = function()
{
	if (!this.multiplayer || !this.playerCount || this.playerCount <= 1)
		return this.player;
	if (typeof(this.playerTargetIndex) === "undefined")
		this.playerTargetIndex = 0;
	else
		this.playerTargetIndex += 1;
	this.playerTargetIndex %= this.multiplayer.length;
	return this.multiplayer[this.playerTargetIndex];
}

Game.prototype.MultiplayerWait = function(id)
{
	if (!this.multiplayer || this.multiplayer.length <= 1)
		return;
	Debug("Multiplayer Wait");
	console.log("Multiplayer wait " + String(id));
	for (var i = 0; i < this.webSockets.length; ++i)
	{
		this.webSockets[i].send("WAIT "+String(id)+"\n");
	}		
	for (var i = 0; i < this.multiplayer.length; ++i)
	{
		this.multiplayer[i].multiplayerWait = id;
	}
	delete this.multiplayer[this.playerID].multiplayerWait;
	this.Pause("MULTIPLAYER SYNC");
}

/**
 * Called whenever a WebSocket message is received
 */
Game.prototype.MultiplayerSync = function(message)
{
	
		Debug("WS: " + String(message));
		tokens = message.split(" ");
		if (!this.messageCount)
		{
			this.messageCount = 0;
		}
		
		if (tokens[0] === "MULTIPLAYER")
		{
			this.multiplayer = [];
			this.playerID = parseInt(tokens[1]);
			this.playerCount = parseInt(tokens[2]);
			//this.multiplayer[this.playerID] = this.player;
			//this.player.playerID = this.playerID;
			
			this.multiplayerKeyState = [];
			for (var i = 0; i < this.playerCount+1; ++i)
			{
				this.multiplayerKeyState[i] = [];
			}
			console.log("Multiplayer Init with " + String(this.playerCount) + " players");
			//this.SetLevel(this.level);
		}
		else if (tokens[1] == "LIFE")
		{
			var playerID = parseInt(tokens[0]);
			if (playerID != this.playerID)
				this.player.GainLife();
		}
		else if (tokens[1] == "WAIT")
		{
			console.log("Got WAIT");
			var playerID = parseInt(tokens[0]);
			if (playerID != this.playerID)
			{
				delete this.multiplayer[playerID].multiplayerWait;
			}
			var stillWaiting = 0;
			for (var i = 0; i < this.multiplayer.length; ++i)
			{
				if (this.multiplayer[playerID].multiplayerWait)
					stillWaiting++;
			}
			if (stillWaiting == 0)
			{
				console.log("Continue");
				Debug("Resume");
				this.Resume();
			}
		}
		else if (tokens[1] == "SPAWN" && parseInt(tokens[0]) != this.playerID)
		{
			console.log("Spawn object");
			this.AddEnemy();
		}
		else
		{
			var playerID = parseInt(tokens[0]);
			var keyCode = parseInt(tokens[1]);
			if (keyCode < 0)
				this.multiplayerKeyState[playerID][Math.abs(keyCode)] = false;
			else
				this.multiplayerKeyState[playerID][Math.abs(keyCode)] = true;
			// multiplayer pause
			if (keyCode == 32 && playerID != this.playerID)
			{
				if (this.running)
				{
					this.playerPaused = playerID;
					this.Pause("Paused by " + String(playerID));
				}
				else if (playerID == this.playerPaused)
				{
					this.Resume();
				}
			}
		}
		
		
		++this.messageCount;
}

Game.prototype.GainLife = function()
{
	for (var i = 0; i < this.webSockets.length; ++i)
	{
		this.webSockets[i].send("LIFE\n");
	}	
}

Game.prototype.LoseLife = function()
{
	for (var i = 0; i < this.webSockets.length; ++i)
	{
		this.webSockets[i].send("DEATH\n");
	}	
}
