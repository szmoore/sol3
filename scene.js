/**
 * Sol III
 */

var g_game;

var g_identityCookie;
var g_nicknameCookie;
var g_maxLevelCookie;
var g_adblockCookie;
var g_touchBarCookie;

function Handshake()
{

	var storedIdentity = GetCookie("identity");
	if (g_identityCookie && storedIdentity != g_identityCookie)
	{
		var cookieWarn = "COOKIE WARNING\n";
		cookieWarn += "Enter a nickname to have your scores and level tracked by rabbitgame.net\n";
		cookieWarn += "Leave blank to stay anonymous.\n";
		if (window.screen.height > 600)
		{
			cookieWarn += "Go to http://rabbitgame.net/cookies.html for more info.\n";
			cookieWarn += "Go to http://rabbitgame.net/view.py to see statistics.\n";
		}
		
		g_nicknameCookie = prompt(cookieWarn);
		
		if (g_nicknameCookie)
		{
			SetCookie("identity", g_identityCookie);
			SetCookie("nickname", g_nicknameCookie);
			SetCookie("maxLevel", 0);
			g_maxLevelCookie = 0;
			if (g_adblockCookie)
				SetCookie("adblock", g_adblockCookie);

			HttpGet("handshake.py")
		}
	}
	else
	{
		g_identityCookie = GetCookie("identity");
		g_nicknameCookie = GetCookie("nickname");
		g_maxLevelCookie = GetCookie("maxLevel");
		if (g_adblockCookie)
			SetCookie("adblock", g_adblockCookie);
		
		// For our legacy users who won't have the nickname yet (hahaha I said legacy)
		if (!g_nicknameCookie || g_nicknameCookie == "")
		{
			var cookieWarn = "COOKIE WARNING\n";
			cookieWarn += "You ALREADY have an identity cookie\n";
			cookieWarn += "But no human readable nickname. Enter a nickname please.\n";
			g_nicknameCookie = prompt(cookieWarn);
			if (g_nicknameCookie)
				SetCookie("nickname", g_nicknameCookie);
		}
		// Because this could be zero and that is valid
		if (typeof(g_maxLevelCookie) === "undefined" || g_maxLevelCookie == "")
		{
			g_maxLevelCookie = 0;
			SetCookie("maxLevel", 0);
		}
	}
	if (g_touchBarCookie)
		SetCookie("touchBar", g_touchBarCookie);
	g_touchBarCookie = GetCookie("touchBar");

	if (g_touchBarCookie === "yes")
	{
		console.log("Enable touch bar");
		var touchBar = document.getElementById("touchBar");
		if (typeof(touchBar) !== "undefined")
		{
			touchBar.style.display = "block";
			InitPage();
		}
		else
			console.log("Failed to enable button controls");
	}
	
	console.log("You are: "+String(g_identityCookie));
	console.log("Your nickname is: "+String(g_nicknameCookie));
	console.log("Your maximum starting level is: "+String(g_maxLevelCookie));
}

/**
 * The main function
 */
function main() 
{
	//Handshake();
	var audio = document.getElementById("theme");
	// Deal with browsers that can't play audiyyyy
	audio = undefined;


	var canvas = document.getElementById("glcanvas");
	g_game = new Game(canvas, audio, document, true);

	
	var welcome_message = "Sol III";
	
	//christmas mode and romantic mode setting

	
	var adblock = GetCookie("adblock");
	if (adblock === "yes")
	{
		g_game.enableAdverts = false;
		console.log("Ads are disabled.");
	}
	else
	{
		g_game.enableAdverts = true;
		console.log("Ads are enabled.");
	}
	
	document.onkeydown = function(event) {g_game.KeyDown(event)};
	document.onkeyup = function(event) {g_game.KeyUp(event)};
	
	
	canvas.addEventListener("touchstart", function(event) {g_game.TouchDown(event.changedTouches[0])});
	canvas.addEventListener("touchmove", function(event) {g_game.TouchDown(event.changedTouches[0])});
	canvas.addEventListener("touchenter", function(event) {g_game.TouchDown(event.changedTouches[0])});
	canvas.addEventListener("touchend", function(event) {g_game.TouchUp(event.changedTouches[0])});
	canvas.addEventListener("touchleave", function(event) {g_game.TouchUp(event.changedTouches[0])});
	canvas.addEventListener("mousedown", function(event) {g_game.MouseDown(event)});
	canvas.addEventListener("mousemove", function(event) {g_game.MouseMove(event)});
	canvas.addEventListener("mouseup", function(event) {g_game.MouseUp(event)});
	
	var startLevel = 1;
	if (g_maxLevelCookie && g_maxLevelCookie >= 2)
	{
		startLevel = prompt("Start at level (1-"+String(g_maxLevelCookie)+")?", String(g_maxLevelCookie));
		if (isNaN(startLevel))
			startLevel = 0;
		startLevel = Math.max(startLevel,0);
		startLevel = Math.min(startLevel, g_maxLevelCookie);
		// It's not like they'll edit their cookies or anything. 
		//   Right?
	}	
	g_game.splashPerformance = (new Date()).getTime();
	var s = function(startLevel) {
		this.AddTimeout("Start", this.Start.bind(this, startLevel),2000)
		this.splashPerformance = (new Date()).getTime() - this.splashPerformance;
		//alert("splash took " + String(this.splashPerformance)+"ms");
	}.bind(g_game, startLevel);
	g_game.canvas.SplashScreen("data/sol3.gif", welcome_message, [0.9,1.0,0.9,1],s);
}
