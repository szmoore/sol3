/**
 * @file enemy.js
 * @brief Characters that chase the player
 */
 
function Enemy(position, velocity, acceleration, canvas, spritePath)
{
	Entity.call(this, position, velocity, acceleration, canvas, spritePath);
	this.dazed = 0;
	this.sleep = 0;
	this.jumpSpeed = 0.9;
	this.name = "Enemy";
	this.ignoreCollisions["Roof"] = true;
	this.ignoreCollisions["Floor"] = true;
	this.ignoreCollisions["Wall"] = true;
	
	this.scale = [64/canvas.width,64/canvas.height];
	this.chaseWidths = 15;
	this.danceWidths = 1.5;
	this.jumpWidths = 15;
}
Enemy.prototype = Object.create(Entity.prototype);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.CollisionActions = {}; // this is slightly whack
Enemy.prototype.ignoreCollisions = {"GreyShooterShot" :true};
/**
 * Try and jump
 */
Enemy.prototype.TryToJump = function()
{
	if (!this.canJump)
		return;
	
	this.canJump = false;
	this.velocity[1] = this.jumpSpeed;
}

/**
 * Enemy step; chase player
 */
Enemy.prototype.Step = function(game)
{
	if (this.dazed && this.dazed > 0)
	{
		this.dazed -= this.delta/1000;
		this.dazed = Math.max(this.dazed, 0);
		this.dazed = Math.min(this.dazed, 2);
	}

	if (this.position[1] > 0.9)
		this.acceleration = [0.3*game.gravity[0], 0.3*game.gravity[1]];
	else
		this.acceleration = game.gravity;

	var player = game.GetNearestPlayer(this.position);

	if (!player || (this.sleep && this.sleep > 0) || (this.dazed && this.dazed > 0))
	{
		return Box.prototype.Step.call(this, game);
	}
	// Calculate displacement and distance from player
	var r = [];
	var r2 = 0;
	for (var i = 0; i < this.position.length; ++i)
	{
		r[i] = player.position[i] - this.position[i];
		r2 += Math.pow(r[i],2);
	}

	// If close, attax
	if (r2 < this.chaseWidths*this.Width())
	{
		if (Math.abs(r[0]) < this.danceWidths*this.Width() && 
			Math.abs(this.velocity[0]) < 0.5*this.speed)
		{
			this.velocity[0] = (Math.random() > 0.5) 
				? -this.speed : this.speed;
		}
		else if (Math.abs(r[0]) > this.Width())
		{
			// Move towards player
			if (player.position[0] < this.position[0])
				this.velocity[0] = -this.speed;
			else if (player.position[0] > this.position[0])
				this.velocity[0] = +this.speed;
		}

		// Jump! (still with Ox hack :S)
		if (player.Bottom() > this.Top() && r2 < this.jumpWidths*this.Width())
			this.TryToJump();
	}
	else
		this.velocity[0] = 0;	

	Entity.prototype.Step.call(this,game);
}

/**
 * Handler for colliding with player
 */
Enemy.prototype.CollisionActions["Humphrey"] = function(other, instigator, game)
{
	if (instigator && this.MovingTowards(other) 
		&& !this.sleep && !this.dazed)
	{
		other.Die(this.GetName(), this, game);
	}
}

Enemy.prototype.Die = function(reason, other, game)
{
	Entity.prototype.Die.call(this,reason,other,game);
}

Enemy.prototype.CollisionActions["Box"] = function(other, instigator, game)
{
	if (this.CollideBox(other, instigator, game) && !this.sleep)
		this.TryToJump();
}

Enemy.prototype.CollideBox = function(other, instigator, game)
{
	//if (other.velocity[1] < -0.1 && other.Bottom() > this.Top() && !instigator)
	if (!instigator && other.MovingTowards(this) && other.Above(this) && other.velocity[1] < -0.4)
	{
		var boxh = other.health;
		if (this.health)
		{
			this.health -= other.health;
			other.health -= this.health;
		}

		if (!this.health || this.health <= 0)
		{
			this.Die(other.GetName(), other, game);
		}
		else
		{
			this.dazed += Math.random()*boxh;
		}
		return false;
	}
	return true;
}

Enemy.prototype.DamagePush = function(other)
{
	if (Entity.prototype.TryToPush.call(this,other))
	{
		other.health -= Math.max(0.4,Math.max(this.velocity[0], this.velocity[1]));
		return true;
	}
	return false;
}

Enemy.prototype.CollisionActions["PlayerShot"] = function(other,instigator,game)
{
	if (--this.health <= 0)
	{
		game.AddEntity(new Explosion(this,game.canvas));
		this.Die(other.GetName(), other, game);
	}
}

function PurpleEater(position, velocity,acceleration, canvas)
{
	Enemy.call(this, position, velocity, acceleration, canvas, "data/PurpleEater");
	this.speed = 0.4;
	this.health = 4;
}
PurpleEater.prototype = Object.create(Enemy.prototype);
PurpleEater.prototype.constructor = PurpleEater;


PurpleEater.prototype.Step = function(game)
{
	var dx = game.player.position[0]-this.position[0];
	var dy = game.player.position[1]-this.position[1];
	var r = Math.sqrt(dx*dx + dy*dy);
	this.velocity[0] = this.speed * dx / r;
	this.velocity[1] = this.speed * dy / r;
	Entity.prototype.Step.call(this,game);
	this.angle = Math.atan2(-this.velocity[1], this.velocity[0]);
}

PurpleEater.prototype.CollisionActions["Player"] = function(other,instigator,game)
{
	if (--other.health <= 0)
		other.Die(this.GetName(), this, game);
}

function GreyShooter(position,velocity,acceleration,canvas)
{
	Enemy.call(this,position,velocity,acceleration,canvas, "data/GreyShooter");
	this.speed = 0.5;
	this.health = 10;
	this.orbitDistance = 0.4;
	this.fireCount = 50;
	this.frameRate = 5;
	this.frameBase["shoot"] = [canvas.LoadTexture("data/GreyShooter/shoot1.png"), canvas.LoadTexture("data/GreyShooter/shoot2.png"),
		canvas.LoadTexture("data/GreyShooter/shoot3.png"),canvas.LoadTexture("data/GreyShooter/shoot3.png"),canvas.LoadTexture("data/GreyShooter/shoot2.png"),canvas.LoadTexture("data/GreyShooter/shoot1.png")];
	if (Math.random() > 0.5)
		this.hand = "left";
	else
		this.hand = "right";
		
}

GreyShooter.prototype = Object.create(Enemy.prototype);
GreyShooter.prototype.constructor = GreyShooter;

GreyShooter.prototype.Step = function(game)
{
	var dx = game.player.position[0]-this.position[0];
	var dy = game.player.position[1]-this.position[1];
	var r = Math.sqrt(dx*dx + dy*dy);
	if (this.frames == this.frameBase["shoot"] && this.frameNumber >= this.frames.length-1)
	{
		this.frames = this.frameBase["main"];
		this.frameNumber = 0;
	}
	if (r > this.orbitDistance)
	{
		this.velocity[0] = this.speed * dx / r;
		this.velocity[1] = this.speed * dy / r;
	}
	else
	{
		
		this.velocity[0] = this.speed*dy/r;
		this.velocity[1] = this.speed*dx/r;	//x*dx + y*dy = 0
		if (this.hand == "left")
			this.velocity[0] = -this.velocity[0];
		else
			this.velocity[1] = -this.velocity[1];
			
		if (this.fireCount-- <= 0)
		{
			game.AddEntity(new GreyShooterShot([this.position[0], this.position[1]], [dx/r, dy/r],[0,0],game.canvas));
			this.fireCount = 50;
			this.frames = this.frameBase["shoot"];
		}
	}
	
	Entity.prototype.Step.call(this,game);
	this.angle = Math.atan2(-dy, dx);
}

function GreyShooterShot(position,velocity,acceleration,canvas)
{
	Entity.call(this, position, velocity, acceleration, canvas, "");
	this.frame = canvas.LoadTexture("data/GreyShooter/shot.png");
	this.name = "GreyShooterShot";
	this.angle = Math.atan2(velocity[1], velocity[0]);
	this.ignoreCollisions["Enemy"] = true;
	this.ignoreCollisions[this.GetName()] = true;
}
GreyShooterShot.prototype = Object.create(Entity.prototype);
GreyShooterShot.prototype.constructor = GreyShooterShot;
GreyShooterShot.prototype.CollisionActions = {};

GreyShooterShot.prototype.Step = function(game)
{
	Entity.prototype.Step.call(this,game);
	this.angle = Math.atan2(-this.velocity[1], this.velocity[0]);
	//Debug("Shot at angle " + this,angle);
}

GreyShooterShot.prototype.HandleCollision = function(other, instigator, game)
{
	Entity.prototype.HandleCollision.call(this, other, instigator, game);
	if (other.GetName() != "GreyShooter" && other.GetName() != this.GetName())
		this.Die(this.GetName(), this, game);
	if (other.GetName() == "Player")
	{
		other.health -= this.damage;
	}
}

GreyShooterShot.prototype.CollisionActions["PlayerShot"] = function(other,instigator,game)
{
	game.AddEntity(new Explosion(this,game.canvas));
	this.Die();
}

