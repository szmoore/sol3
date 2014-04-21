/**
 * See game.js for boring details of what this is
 */

/** The canvas **/
var gCanvas;
/** gl context **/
var gl;
	

/** GL Shader Program **/
var shaderProgram;

/** GL Vertex Shader Attributes **/
var aVertexPosition;
var aTextureCoord;

/** GL Vertex Shader Uniforms **/
var uPosition;
var uAspectRatio;
var uColour;
var uRotation;

/** GL Buffers **/
var gVerticesBuffer;
var gVerticesTextureCoordBuffer;
var gVerticesIndexBuffer;

var gTextures = {};


/**
 * Debug; display information on the page (for most things this is much nicer than Alt-Tabbing to and fro with Firebug)
 */
function Debug(html, clear)
{
	var div = document.getElementById("debug");
	if (div)
	{
		div.innerHTML = html;
		if (html == "")
			div.innerHTML="<font color=\"white\">...</font>"
	}
}


function SpriteToRGBA(sprite1)
{
	var rgba1 = [];
	for (var x = 0; x < sprite1.width; ++x)
	{
		rgba1[x] = [];
		for (var y= 0; y < sprite1.height; ++y)
		{
			var index = (+x+ +y*sprite1.width)*4;
			var pix = [0,0,0,0];
			for (var i in pix)
			{
				pix[i] = sprite1.data[+index + +i];
			}
			rgba1[x][y] = pix;
		}
	}
	return {width : sprite1.width, height : sprite1.height, rgba : rgba1};

}
/**
 * Sprite based collision
 */
function SpriteCollision(offset, sprite1, sprite2)
{
	for (var x = 0; x < sprite1.width; ++x)
	{
		var xx = +x + +offset[0];
		if (xx < 0 || xx >= sprite2.width) continue;
		for (var y = 0; y < sprite1.height; ++y)
		{
			var yy = +y + +offset[1];
			if (yy < 0 || yy >= sprite2.height) continue;
			var pix1 = sprite1.rgba[x][y];
			var pix2 = sprite2.rgba[xx][yy];
			if (pix1[3] > 10 && pix2[3] > 10) return true;
		}
	}
	return false;
}

function LocationGLToPix(x, y)
{
	var xx = Math.round((1+x)*gCanvas.width/2);
	var yy = Math.round((1-y)*gCanvas.height/2);
	return [xx,yy];
}

function LocationPixToGL(x, y)
{
	var xx = 2*(0.5 - x/gCanvas.width);
	var yy = 2*(0.5 - y/gCanvas.width);
	return [xx,yy];
}

/**
 * Initialize WebGL, returning the GL context or null if
 * WebGL isn't available or could not be initialized.
 */
function InitWebGL() 
{
	gl = null;
	try
	{
	    gl = gCanvas.getContext("experimental-webgl");
	}
	catch(e) {}
  
	// If we don't have a GL context, give up now
	if (!gl)
	{
		alert("Unable to initialize WebGL. Your browser or graphics card may not support it.\n\nWill use canvas drawing instead (slower)");
	}

}

/**
 * Load textures
 */
function LoadTexture(src, lambda)
{
	if (src in gTextures)
	{
		if (lambda) {setTimeout(lambda, 500)}
		return gTextures[src];
	}
	
	var texture = (gl) ? gl.createTexture() : null;
	var image = new Image();
	gTextures[src] = {tex: texture, img: image, data : null};
	if (lambda)
		image.onload = function() {HandleTextureLoaded(gTextures[src]); lambda()};
	else
		image.onload = function() {HandleTextureLoaded(gTextures[src])};

	image.src = src; 
	return gTextures[src];
}



/**
 * When a texture is loaded, do this
 */
function HandleTextureLoaded(texData)
{
	image = texData.img;
	texture = texData.tex;
 	if (gl && texture)
		 gl.bindTexture(gl.TEXTURE_2D, texture);

	if (gSpriteCollisions || ((image.width & (image.width - 1)) != 0 || (image.height & (image.height - 1)) != 0))
	{
		var canvas = document.createElement("canvas");
		var w = image.width; var h = image.height;
		--w; for (var i = 1; i < 32; i <<= 1) w = w | w >> i; ++w;
		--h; for (var i = 1; i < 32; i <<= 1) h = h | h >> i; ++h;
		canvas.width = w;
		canvas.height = h;
		var ctx = canvas.getContext("2d");
		ctx.rect(0,0,w,h);
		ctx.drawImage(image, w/2 - image.width/2, h/2 - image.height/2, image.width, image.height);
		texData.data = SpriteToRGBA(ctx.getImageData(0,0,w,h));
			
		//ctx.font = "30px Courier";
		//ctx.fillText("hello world\nhow are you", 0.1*w, h/2, 0.8*w);
		/*
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(w,0);
		ctx.lineTo(w,h);
		ctx.lineTo(0,h);
		ctx.lineTo(0,0);
		ctx.stroke();
		*/
		texData.img = canvas;
	}

	if (gl && texture)
	{
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texData.img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}



/**
 * Initialises buffers that will be sent to the shaders
 */
function InitBuffers()
{
	// Bind vertices (A rectangle)
	gVerticesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, gVerticesBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

	// Bind vertex indices
	gVerticesIndexBuffer  = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gVerticesIndexBuffer);
	
	var indices = [
		0,1,2, 0,3,2 // indices of vertices of two triangles that make a square 
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	// Bind texture vertices
	gVerticesTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, gVerticesTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 1,0, 0,0]), gl.STATIC_DRAW);
}
//
// InitShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function InitShaders() 
{
	var fragmentShader = GetShader(gl, "shader-fs");
	var vertexShader = GetShader(gl, "shader-vs");
  
	// Create the shader program
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
  
	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) 
	{
		alert("Unable to initialize the shader program.");
	}
  
	gl.useProgram(shaderProgram);
 
	// Set attributes

	// Textures
	aTextureCoord = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(aTextureCoord);

	// Vertices
	aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(aVertexPosition); // Remember to do this. Or nothing will get drawn.

	// Set uniforms
	uPosition = gl.getUniformLocation(shaderProgram, "uPosition");
	uAspectRatio = gl.getUniformLocation(shaderProgram, "uAspectRatio");
	uScale = gl.getUniformLocation(shaderProgram, "uScale");
	uColour = gl.getUniformLocation(shaderProgram, "uColour");
	uRotation = gl.getUniformLocation(shaderProgram, "uRotation");
	gl.uniform4f(uColour, 1,1,1,1);
	// Set it
	gl.uniform1f(uAspectRatio, gCanvas.width/gCanvas.height);
	//gl.uniform1f(uAspectRatio, 1);
}

//
// GetShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function GetShader(gl, id) {
  var shaderScript = document.getElementById(id);
  
  // Didn't find an element with the specified ID; abort.
  
  if (!shaderScript) {
    return null;
  }
  
  // Walk through the source element's children, building the
  // shader source string.
  
  var theSource = "";
  var currentChild = shaderScript.firstChild;
  
  while(currentChild) {
    if (currentChild.nodeType == 3) {
      theSource += currentChild.textContent;
    }
    
    currentChild = currentChild.nextSibling;
  }
  
  // Now figure out what type of shader script we have,
  // based on its MIME type.
  
  var shader;
  
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;  // Unknown shader type
  }
  
  // Send the source to the shader object
  
  gl.shaderSource(shader, theSource);
  
  // Compile the shader program
  
  gl.compileShader(shader);
  
  // See if it compiled successfully
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }
  
  return shader;
}
