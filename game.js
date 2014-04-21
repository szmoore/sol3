/**
 * Sol III - In glorious WebGL Form
 *
 * tl;dr A game where you play as a Spaceship who must avoid Blobs and Shots
 *
 * History that is only of significance to the author:
 * Sol III was the only game I ever actually completed using Gamemaker 6.1
 * After the immense... [lack of] popularity... of Humphrey The Rabbit, I decided to try porting Sol III to WebGL (ok, canvas2d if you don't have webgl)
 * 
 * One day it'll probably get rewritten in C++ where it belongs.
 * 
 * Credits:
 * Sam Moore, 2014
 */

/** Other globals **/
var gEntities = [];
var gStepRate = 60;
var gKeysPressed = [];
var gPlayer;
var gRunTime = 0;
var gStepCount = 0;
var gSpriteCollisions = false;
var gMouse = [0,0];

/**
 * Game Entity
 */
function Entity(position, velocity)
{
	this.position = position;
	this.velocity = velocity;
	this.lastPosition = []; for (var i in this.position) this.lastPosition[i] = this.position[i];
}

/**
 * Name of Entity
 */
Entity.prototype.GetName = function()
{
	return (this.name) ? this.name : "unnamed";
}

/**
 * Update frame
 */
Entity.prototype.UpdateFrames = function()
{

}

Entity.prototype.UpdateFrameNumber = function()
{
	// Update frame
	if (this.frames && this.frameRate)
	{
		this.sprite = this.frames[0];
		if (!this.frameNumber) this.frameNumber = 0;
		this.frameNumber += this.delta * this.frameRate / 1000;
		this.frame = this.frames[Math.floor(this.frameNumber) % this.frames.length]
	}
}

/**
 * Step
 * TODO: Split into helpers?
 */
Entity.prototype.Step = function()
{
	var currentTime = (new Date()).getTime();
	if (!this.lastUpdateTime)
	{
		this.lastUpdateTime = currentTime;
		return;
	}
	this.delta = currentTime - this.lastUpdateTime;

	this.lastPosition = [];

	// Deal with keyboard state
	if (this.handleKeys)
		this.handleKeys(gKeysPressed);

	// Update velocity
	if (this.acceleration)
	{
		for (var i in this.velocity)
			this.velocity[i] += this.delta * this.acceleration[i] / 1000;
	}

	this.UpdateFrames();


	// Update position
	for (var i in this.position)
	{
		if (this.velocity[i] == 0) continue;
		this.lastPosition[i] = this.position[i];
		this.position[i] += this.delta * this.velocity[i] / 1000;

		// Check for collisions
		collide = this.Collision();
		if (collide)
		{
				// Soo... this is terribly inefficient and lazy
				// But slightly better than what I had before
				// Binary search to location of collision
				var upper = this.position[i];
				var lower = this.lastPosition[i]; 
				while (Math.abs(upper-lower) > 1e-4)
				{
					this.position[i] = (upper + lower)/2; 
					if (this.Collides(collide))
						upper = this.position[i];
					else
						lower = this.position[i];
				}
				this.position[i] = lower;

				// Last resort?
				if (this.Collides(collide))
				{
					if (this.position[i] > collide.position[i])
						this.position[i] = collide.position[i] + 1.1*this.Dimension(i);
					else if (this.position[i] <= collide.position[i])
						this.position[i] = collide.position[i] - 1.1*collide.Dimension(i);
				}
				
				if (this.HandleCollision(collide,true))
					this.velocity[i] = 0;
				this.UpdateFrames();
		}
	}

	// Update angle
	this.angle = Math.atan2(this.velocity[1], this.velocity[0]);

	this.UpdateFrameNumber();

	// Finalise step
	this.lastUpdateTime = currentTime;
	for (var i in this.position) this.lastPosition[i] = this.position[i];
}

Entity.prototype.Top = function() {return this.position[1] + this.bounds.max[1];}
Entity.prototype.Bottom = function() {return this.position[1] + this.bounds.min[1];}
Entity.prototype.Left = function() {return this.position[0] + this.bounds.min[0];}
Entity.prototype.Right = function() {return this.position[0] + this.bounds.max[0];}
Entity.prototype.Width = function() {return this.bounds.max[0] - this.bounds.min[0]}
Entity.prototype.Height = function() {return this.bounds.max[1] - this.bounds.min[1]}
Entity.prototype.Dimension = function(i) {return Math.abs((i == 0) ? this.Width() : this.Height());}

/**
 * Get the actual bounding box
 */
Entity.prototype.GetBoundBox = function()
{
	var box = { min : [], max : [] };
	for (var i in this.position)
	{
		box.min[i] = this.position[i];
		box.max[i] = this.position[i];
		if (this.bounds)
		{
			box.min[i] += this.bounds.min[i];
			box.max[i] += this.bounds.max[i];
		}
	}
	return box;
}


/**
 * Find Object that collides with this one
 */
Entity.prototype.Collision = function()
{
	for (var i in gEntities)
	{
		if (gEntities[i] === this) continue;
		if (this.ignoreCollisions && this.ignoreCollisions[gEntities[i].GetName()]) continue;
		if (this.ignoreCollisionsEntity && this.ignoreCollisionsEntity[gEntities[i]]) continue;
		if (this.Collides(gEntities[i])) return gEntities[i];
	}
}

/**
 * Detect collision
 */
Entity.prototype.Collides = function(other)
{
	if (!other.bounds || !this.bounds) return;

	var A = this.GetBoundBox();
	var B = other.GetBoundBox();

	var collides = true;
	for (var i in this.position)
	{
		collides &= (A.min[i] <= B.max[i] && A.max[i] >= B.min[i]);
	}
	if (collides && gSpriteCollisions && this.sprite && other.sprite && this.sprite.data && other.sprite.data)
	{
		tl1 = LocationGLToPix(this.Left(), this.Top());
		tl2 = LocationGLToPix(other.Left(), other.Top());
		offset = [tl2[0]-tl1[0], tl2[1]-tl1[1]];
		collides &= SpriteCollision(offset, this.sprite.data, other.sprite.data);
	}
	return collides;
}


/**
 * Deal with a collision
 */
Entity.prototype.HandleCollision = function(other, instigator)
{
	if (this.ignoreCollisions && this.ignoreCollisions[other.GetName()]) return false;	
	if (instigator)
		other.HandleCollision(this, false);
	if (typeof(this.canJump) !== "undefined") 
	{
		if (typeof(other.canJump) === "undefined")
			this.canJump = (other.Bottom() <= this.Top());
		else
			this.canJump = (this.Top() > other.Top());
	}	
	return true;
}


/**
 * Bounce off a surface with normal vector n
 */
Entity.prototype.Bounce = function(n, reflect)	
{
	if (this.lastPosition)
	{
		for (var i in this.lastPosition) this.position[i] = this.lastPosition[i];
	}
    
	var dot = 0;
	for (var j in this.velocity)
	{
    	dot += this.velocity[j] * n[j];
	}

//	alert("Bounce normal ["+n+"] , v ["+this.velocity+"] , dot "+dot);
    for (var j in this.velocity)
    {
		this.velocity[j] -= dot*n[j]; // zero in direction of normal only.
		this.position[j] += this.delta * this.velocity[j] / 1000;
		//this.lastPosition[j] = this.position[j];
	}
//	alert("velocity: ["+this.velocity+"]");
	this.canJump = (typeof(this.canJump) !== "undefined")
}

/**
 * Remove entity
 */
Entity.prototype.Die = function()
{
	var index = gEntities.indexOf(this);
	if (index > -1 && index < gEntities.length)
	{
		gEntities.splice(index, 1);
	}
	else
	{
		// Probably already died, since IE doesn't have WebGL and can't play anyway
		//alert("Entities can't die in IE<9 because IE is dumb.");
	}	
}


/**
 * Draw
 * Draws the Entity at its curnrent position.
 */
Entity.prototype.Draw = function()
{
	if (!this.frame)
		return;

	if (!gl)
	{
		var tl = LocationGLToPix(this.Left(), this.Top());
		var ctx = canvas.getContext("2d");
		var w = this.frame.img.width;
		var h = this.frame.img.height;
		if (this.scale)
		{
			w = this.scale[0] * canvas.width;
			h = this.scale[1] * canvas.height;
		}
		ctx.drawImage(this.frame.img, tl[0], tl[1], w, h);
		return;
	}

	// Send position offset to shader
	gl.uniform2f(uPosition, this.position[0], this.position[1]);
	
	// Send rotation angle to shader
	gl.uniform2f(uRotation, Math.sin(this.angle), Math.cos(this.angle));

	// Send vertices to shaders
	gl.bindBuffer(gl.ARRAY_BUFFER, gVerticesBuffer);
	gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

	// Setup texture to draw in shaders
	gl.bindBuffer(gl.ARRAY_BUFFER, gVerticesTextureCoordBuffer);
	gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
	if (this.frame.tex)
		gl.bindTexture(gl.TEXTURE_2D, this.frame.tex);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

	// Set the scale of this object
	if (this.scale)
		gl.uniform2f(uScale, this.scale[0],this.scale[1]);
	else if (this.frame.img)
		gl.uniform2f(uScale, this.frame.img.width/canvas.width, this.frame.img.height/canvas.height);

	// Set vertex indices and then draw the rectangle
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gVerticesIndexBuffer);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

}


/*
 * Draw the Scene and perform Steps
 */
function DrawScene()
{
	var curTime = (new Date()).getTime();
	if (!this.lastTime)
	{
		gRunTime += gStepRate/1000;
	}
	else
	{
		gRunTime += curTime - this.lastTime;
	}
	this.lastTime = curTime;
	var rt = document.getElementById("runtime");
	if (rt) rt.innerHTML=(""+gRunTime/1000).toHHMMSS();

	var color = [0,0,0,1]
	if (!gl)
	{
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0,0, canvas.width, canvas.height);
		ctx.rect(0,0,canvas.width, canvas.height);
		for (var i = 0; i < color.length; ++i) color[i] = Math.round(color[i]*255);
		ctx.fillStyle = "rgba("+color+")";
		ctx.fill();
	}
	else
	{	
		gl.clearColor(color[0], color[1], color[2], color[3])
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	for (var i in gEntities)
	{
		gEntities[i].Step();
		gEntities[i].Draw();
	}
	gStepCount += 1;
}


/**
 * The main function
 */
function main() 
{
	// Keyboards
	document.onkeydown = function(event) {
		gKeysPressed[event.keyCode] = true; 
	};
	document.onkeyup = function(event) {gKeysPressed[event.keyCode] = false};

	canvas = document.getElementById("glcanvas");
	InitWebGL(canvas);      // Initialize the GL context
	if (gl)
	{
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
		gl.clearColor(0, 0, 0, 1.0); // Set clear colour 
		gl.viewport(0,0,canvas.width,canvas.height); // Set viewport (unnecessary?)
    		// Initialise the buffer objects
		InitBuffers();
	    	// Initialize the shaders
		InitShaders();
	}

	canvas.addEventListener('mousemove', function(event) {
		var rect = canvas.getBoundingClientRect();
		gMouse[0] = event.clientX - rect.left;
		gMouse[1] = event.clientY - rect.top;
	});

	canvas.addEventListener('mousedown', function(event) {
		var rect = canvas.getBoundingClientRect();
		var target = LocationPixToGL(event.clientX - rect.left, event.clientY - rect.top);
		gPlayer.AddShot(target, "data/player_shot.gif");		
	});

	StartGame();
}

Entity.prototype.AddShot = function(target, sprite)
{
	var shot = new Entity([this.position[0], this.position[1]], [this.velocity[0], this.velocity[1]]);
	shot.creator = this;
	if (typeof(this.ignoreCollisionsEntity) === "undefined")
	{
			this.ignoreCollisionsEntity = {};
	}
	this.ignoreCollisionsEntity[shot] = true;
	shot.frame = LoadTexture(sprite);
	shot.scale = [shot.frame.img.width/canvas.width, shot.frame.img.height/canvas.height];
	

	var dist = 0;
	shot.speed = 0.7;
	for (var i = 0; i < 2; ++i)
		dist += Math.pow((target[i] - this.position[i]),2);
	dist = Math.pow(dist, 0.5);
	shot.velocity[0] = shot.speed * (this.position[0] - target[0]) / dist;
	shot.velocity[1] = shot.speed * (target[1] - this.position[1]) / dist;
	shot.Collides = function(other)
	{
		if (other === this.creator)
			return false;
		return Entity.prototype.Collides.call(this, other);
	}

	gEntities.push(shot);
}

function StartGame()
{
	gPlayer = new Entity([0,0],[0,0]);
	gPlayer.frame = LoadTexture("data/player.gif");
	gPlayer.speed = 0.4;
	gPlayer.Step = function()
	{
		Entity.prototype.Step.call(this);
		var p = LocationGLToPix(this.position[0], this.position[1]);
		this.angle = Math.atan2(gMouse[1] - p[1], gMouse[0] - p[0]);
	}
	gPlayer.handleKeys = function(keys)
	{
		this.velocity[0] = 0;
		this.velocity[1] = 0;
		if (keys[37] || keys[65]) this.velocity[0] -= this.speed; // left or A
		if (keys[39] || keys[68]) this.velocity[0] += this.speed; // right or D
		if (keys[38] || keys[87]) this.velocity[1] += this.speed; // up or W
		if (keys[40] || keys[83]) this.velocity[1] -= this.speed; // down or S
	}
	gEntities.push(gPlayer);
	
	setInterval(DrawScene, gStepRate);
}
