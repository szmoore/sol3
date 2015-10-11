/**
 * @file player.js
 * @brief The main player
 */

function Player(position, velocity, acceleration, canvas, spritePath)
{
	Entity.call(this, position, velocity, acceleration, canvas, spritePath);
	this.stomp = 0.2;
	this.lives = 0;
	this.name = "Player";
	this.ignoreCollisions["PlayerShot"] = true;
	this.spawn = [];
	this.health = 100;
	this.canShoot = true;
	for (var i = 0; i < position.length; ++i)
		this.spawn[i] = position[i];
	this.scale = [72/canvas.width,72/canvas.height];
}
Player.prototype = Object.create(Entity.prototype);
Player.prototype.constructor = Player;
Player.prototype.CollisionActions = {}; // this is slightly whack

Player.prototype.HandleKeys = function(keys)
{
	this.velocity[0] = 0;
	this.velocity[1] = 0;
	if (keys[37] || keys[65]) 
	{
		this.velocity[0] -= this.speed; // left or A
		//console.log("Left");
	}
	if (keys[39] || keys[68]) 
	{
		this.velocity[0] += this.speed; // right or D
		//console.log("Right");
	}

	if (this.canJump && (keys[38] || keys[87])) // up or W
	{
		this.velocity[1] += this.speed;
		//console.log("Jump");
	}
	if ((keys[40] || keys[83]) && this.velocity[1] > -5) // down or S
		this.velocity[1] -= this.speed;
	this.keys = keys;
}

Player.prototype.Step = function(game)
{
	Entity.prototype.Step.call(this,game);
	this.angle = Math.atan2( -game.mouseY + this.position[1], game.mouseX - this.position[0]);
	if (this.shield && !this.shield.alive)
	{
		delete this.shield;
		delete this.hat;
	}
}

Player.prototype.Die = function(deathType, other, game)
{
	if (this.shield)
	{
		//if (other)
		//	other.Die(this.GetName());
		return;
	}
	
	if (--game.player.lives < 0)
	{
		this.deathType = deathType;
		return Entity.prototype.Die.call(this, deathType);
	}
	else
	{
		
		for (var i = 0; i < this.position.length; ++i)
			this.position[i] = this.spawn[i];
		this.AddShield(game);
		game.UpdateDOM(this);
		
		//if (g_identityCookie)
		//	this.PostStats("Lose life "+deathType,game)
	}
	game.LoseLife();
}


/**
 * Collision handler for a Box
 */
Player.prototype.CollisionActions["Box"] = function(other, instigator, game)
{
	if (!instigator)
	{
		if (other.MovingTowards(this) && other.Above(this) 
		&& Math.abs(other.velocity[1] - this.velocity[1]) > 0.2 && other.velocity[1] < -0.4)
		{
			this.Die(other.GetName(), other, game);
		}
		return true;
	}
	
	if (this.IsStomping(other))
	{
		other.health -= 1;
		return true;
	}
	
	
	if (this.Bottom() < other.Top())
	{
		other.velocity[0] = this.velocity[0]/2;
		if (other.Top() - this.Bottom() < 0.05*other.Height())
			this.position[1] += 0.07*other.Height();
		return false;
	}
	this.WallRun(other, instigator, game);
}

Player.prototype.WallRun = function(other, instigator, game)
{
	if (other.position[0] > this.position[0] && this.keys && 
		(this.keys[37] || this.keys[65]) && (this.keys[38] || this.keys[87]))
	{
		this.angle = Math.PI/2;
		this.frames = this.frameBase.left;
		this.holdFrame = true;
	}
	else if (other.position[0] < this.position[0] && this.keys &&
		(this.keys[39] || this.keys[68]) && (this.keys[38] || this.keys[87]))
	{
		this.angle = -Math.PI/2;
		this.frames = this.frameBase.right;
		this.holdFrame = true;
	}
	else if (other.position[0] > this.position[0] && this.keys && 
		(this.keys[37] || this.keys[65]) && (this.keys[40] || this.keys[83]))
	{
		this.angle = Math.PI/2;
		this.frames = this.frameBase.right;
		this.holdFrame = true;
	}
	else if (other.position[0] < this.position[0] && this.keys &&
		(this.keys[39] || this.keys[68]) && (this.keys[40] || this.keys[83]))
	{
		this.angle = -Math.PI/2;
		this.frames = this.frameBase.left;
		this.holdFrame = true;
	}
	
	this.CanJump(other);	
}

Player.prototype.CollisionActions["Wall"] = function(other, instigator, game)
{
	this.WallRun(other, instigator, game);
	return true;
} 





Player.prototype.IsStomping = function(other)
{
	return ((this.Bottom() >= other.Top()-0.1*other.Height()) && (this.velocity[1] < -2.5));
}

/**
 * Collision handler for a Fox
 */
Player.prototype.CollisionActions["Fox"] = function(other, instigator, game)
{
	if (instigator && this.IsStomping(other))
	{
		other.sleep = Math.random() * Math.abs(this.velocity[1] - other.velocity[1]) * 5 + 5;
		other.velocity[0] /= 2;
	}
	else if (instigator && other.sleep)
	{
		Player.prototype.CollisionActions["Box"].call(this,other,instigator,game);
	}
}

Player.prototype.CollisionActions["Wolf"] = function(other, instigator, game)
{
	if (instigator && this.IsStomping(other))
	{
		if (other.health <= 1)
		{
			other.sleep = Math.random() * Math.abs(this.velocity[1] - other.velocity[1]) * 5;
			other.velocity[0] /= 2;
		}
		else
			other.health -= 1;
	}
	else if (instigator && other.sleep)
	{
		Player.prototype.CollisionActions["Box"].call(this,other,instigator,game);
	}
}

Player.prototype.DeathScene = function(game, onload)
{
	var image = "data/rabbit/drawing3.svg";
	var text = "You died of mysterious causes.";
	var colour = [1,1,1,1];
	console.log(this.deathType);
	Debug("Dying");
	switch (this.deathType)
	{
		default:
			image = "data/gameover.svg";
			text = "You were killed";
			colour = [1,1,1,1];
			break;
	}
//	if (g_identityCookie)
	//this.PostStats("Killed "+this.deathType,game)
		
	game.canvas.SplashScreen(image, text, colour, onload);
}

Player.prototype.PostStats = function(type, game, callback)
{
	// fields = ["start", "runtime", "steps", "type", "x", "y", "foxesSquished", "bossesSquished", "level"]
	var foxesSquished = game.deathCount["Fox"];
	if (!foxesSquished)
		foxesSquished = 0;
		
	var bossesSquished = 0;
	if (game.deathCount["Wolf"])
		bossesSquished += game.deathCount["Wolf"];
	if (game.deathCount["Ox"])
		bossesSquished += game.deathCount["Ox"];
		
	fields = {
		"start" : game.startTime,
		"runtime" : game.runTime,
		"steps" : game.stepCount,
		"type" : type,
		"x" : this.position[0],
		"y" : this.position[1],
		"foxesSquished" : foxesSquished,
		"bossesSquished" : bossesSquished,
		"level" : game.level,
		"lives" : this.lives,
		"distanceMoved" : this.distanceMoved
	}
	HttpPost("stats.py", fields,callback);
}

Player.prototype.Draw = function(canvas)
{
	Entity.prototype.Draw.call(this, canvas);
	
	// hack to get shield to always appear on top of player
	if (this.shield)
	{
		this.shield.Draw(canvas);
	}
	
	if (typeof(this.playerID) !== "undefined")
	{
		Entity.prototype.DrawText.call(this, canvas, String(this.playerID));
	}

}

/**
 * Hacky way to add shield special effects
 */
Player.prototype.AddShield = function(game)
{
	if (this.shield && this.shield.alive)
		this.shield.Die();
	if (this.hat && this.hat.alive)
		this.hat.Die();
		
	this.shield = new SFXEntity(this, 1000/game.stepRate, ["data/sfx/shield1.png"], game.canvas, [0,0]);
	this.hat = new SFXEntity(this, 1000/game.stepRate, ["data/hats/hat1_big.gif"], game.canvas, [0,this.Height()]);
	game.AddEntity(this.shield);
	game.AddEntity(this.hat);
}


Player.prototype.GainLife = function(life, game)
{
	game.player.lives++;
	this.AddShield(game);
	game.UpdateDOM(this);
	game.GainLife();
	//if (g_identityCookie)
	//	this.PostStats("Gain life",game)
}

function PlayerShot(position, velocity, acceleration, canvas, game)
{
	Entity.call(this, position, velocity, acceleration, canvas, "");
	this.frame = canvas.LoadTexture("data/player/shot.png");
	this.name = "PlayerShot";
	this.angle = Math.atan2(velocity[1], velocity[0]);
	this.ignoreCollisions["Player"] = true;
	this.ignoreCollisions[this.GetName()] = true;
}

PlayerShot.prototype = Object.create(Entity.prototype);
PlayerShot.prototype.constructor = PlayerShot;
PlayerShot.prototype.CollisionActions = {};

PlayerShot.prototype.Step = function(game)
{
	Entity.prototype.Step.call(this,game);
	this.angle = Math.atan2(-this.velocity[1], this.velocity[0]);
	//Debug("Shot at angle " + this,angle);
}

PlayerShot.prototype.HandleCollision = function(other, instigator, game)
{
	Entity.prototype.HandleCollision.call(this, other, instigator, game);
	if (other.GetName() != "Player" && other.GetName() != this.GetName())
		this.Die(this.GetName(), this, game);
}

