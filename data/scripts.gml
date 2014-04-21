#define scr_sideways_left
   var xn,yn;
   xn = x - sin(direction*pi/180);
   yn = y - cos(direction*pi/180);
   x = xn; y = yn;

#define scr_stepforward
   var xn,yn;
   xn = 4*cos(direction*pi/180);
   yn = -4*sin(direction*pi/180);
   if (not place_meeting(xn,yn,obj_ships_basic))
   {
      x += xn; y += yn;
   }
   else
   {
      x = xprevious;
      y = yprevious;
   }


#define scr_stepbackwards
   var xn,yn;
   xn = 4*cos(direction*pi/180);
   yn = -4*sin(direction*pi/180);
   if (not place_meeting(xn,yn,obj_ships_basic))
   {
      x -= xn; y -= yn;
   }
   else
   {
      x = xprevious;
      y = yprevious;
   }


#define scr_sideways_right
   var xn,yn;
   xn = x + sin(direction*pi/180);
   yn = y + cos(direction*pi/180);
   x = xn; y = yn;

#define scr_enemy2_movement
//Locate the enemy
if (instance_number(obj_enemy_basic) > 0)
{
   tx = instance_nearest(x,y,obj_good_ship).x;
   ty = instance_nearest(x,y,obj_good_ship).y;
}
else
{
   tx = x
   ty = y
}

direction = point_direction(x,y,tx,ty)
move = 0

//Retreat if the player is too close.
//Retreat if the enemy is too close.
if (point_distance(x,y,tx,ty) <= 128) 
{
   mp_potential_step_object(tx,ty,-8,obj_ships_basic);
   move = 1
   
}

//Advance if the enemy is becoming far away.
if (point_distance(x,y,tx,ty) >= 256)
{
   mp_potential_step_object(tx,ty,8,obj_ships_basic);
   move = 1   
   
}

//Circle the player if I am at the right distance
if (move = 0)
{

   if (side = 1)
   {
      repeat(8)
      {
         script_execute(scr_sideways_left);
      }
   }
   else
   {
      repeat(8)
      {
         script_execute(scr_sideways_right);
      }   
   }
   
}


#define scr_enemy4_movement
//Locate the enemy
if (instance_number(obj_enemy_basic) > 0)
{
   tx = instance_nearest(x,y,obj_good_ship).x;
   ty = instance_nearest(x,y,obj_good_ship).y;
}
else
{
   tx = x
   ty = y
}


direction = point_direction(x,y,tx,ty)
speed = 0
//Retreat if the player is too close.
if (point_distance(x,y,tx,ty) <= 128) 
{
   mp_potential_step_object(tx,ty,-8,obj_ships_basic);
   
}

//Advance if the player is becoming far away.
if (point_distance(x,y,tx,ty) >= 256)
{
   mp_potential_step_object(tx,ty,8,obj_ships_basic);
   
}

//Circle the player if I am at the right distance or circle to the side to avoid incoming shots
if ((speed = 0)||(collision_circle(x,y,128,obj_player_shot,true,true) > 0))
{

   if (side = 1)
   {
      repeat(8)
      {
         script_execute(scr_sideways_left);
      }
   }
   else
   {
      repeat(8)
      {
         script_execute(scr_sideways_right);
      }   
   }
   
}


#define scr_ally4_movement
//Locate the enemy
if (instance_number(obj_enemy_basic) > 0)
{
   tx = instance_nearest(x,y,obj_enemy_basic).x;
   ty = instance_nearest(x,y,obj_enemy_basic).y;
}
else
{
   tx = obj_planet1.x;
   ty = obj_planet1.y;
}




direction = point_direction(x,y,tx,ty)
speed = 0
//Retreat if the enemy is too close.
if (point_distance(x,y,tx,ty) <= 128) 
{
   mp_potential_step_object(tx,ty,-8,obj_ships_basic);
   
}

//Advance if the enemy is becoming far away.
if (point_distance(x,y,tx,ty) >= 256)
{
   mp_potential_step_object(tx,ty,8,obj_ships_basic);
   
}

//Circle the enemy if I am at the right distance or circle to the side to avoid incoming shots
if ((speed = 0)||(collision_circle(x,y,128,obj_ally1_shot,true,true) > 0))
{

   if (side = 1)
   {
      repeat(8)
      {
         script_execute(scr_sideways_left);
      }
      script_execute(scr_stepforward);
   }
   else
   {
      repeat(8)
      {
         script_execute(scr_sideways_right);
      }  
      script_execute(scr_stepbackwards);       
   }
   
}


#define scr_enemy6_movement
//Locate the enemy
if (instance_number(obj_good_ship) > 0)
{
   tx = instance_nearest(x,y,obj_good_ship).x;
   ty = instance_nearest(x,y,obj_good_ship).y;
}
else
{
   tx = random(room_width);
   ty = random(room_height);
}
direction = point_direction(x,y,tx,ty)
speed = 0
//Retreat if the enemy is too close.
if (point_distance(x,y,tx,ty) <= 128) 
{
   mp_potential_step_object(tx,ty,-8,obj_ships_basic);
   
}

//Advance if the enemy is becoming far away.
if (point_distance(x,y,tx,ty) >= 256)
{
   mp_potential_step_object(tx,ty,8,obj_ships_basic);
   
}


//Circle the player if I am at the right distance or circle to the side to avoid incoming shots.
if ((speed = 0)||(collision_circle(x,y,128,obj_player_shot,true,true) > 0))
{

   if (collision_circle(x,y,128,obj_player_shot,true,true) > 0)
   {
      if (side = 1)
      {
         repeat(8)
         {
            script_execute(scr_sideways_right);
         }
      }
      else
      {
         repeat(8)
         {
            script_execute(scr_sideways_left);
         }   
      }       
   }
   else
   {
      if (side = 1)
      {
         repeat(8)
         {
            script_execute(scr_sideways_left);
         }  
      }
      else
      {
         repeat(8)
         {
            script_execute(scr_sideways_right);
         }

      }
   }
}


#define scr_demo_movement
//Locate the enemy
if (instance_number(obj_enemy_basic) > 0)
{
   tx = instance_nearest(x,y,obj_enemy_basic).x;
   ty = instance_nearest(x,y,obj_enemy_basic).y;
   backup = 1;   
}
else
{
   if (instance_number(obj_item_basic) > 0)
   {
      tx = instance_nearest(x,y,obj_item_basic).x;
      ty = instance_nearest(x,y,obj_item_basic).y;
      backup = 0;
   }
}
direction = point_direction(x,y,tx,ty)
speed = 0




//Advance if the enemy is becoming far away.
if (point_distance(x,y,tx,ty) >= 256)
{
   mp_potential_step_object(tx,ty,8,obj_ships_basic);
}



//Circle the player if I am at the right distance or circle to the side to avoid incoming shots.
if ((speed = 0)||(collision_circle(x,y,128,obj_enemy2_shot,true,true) > 0))
{

   if (collision_circle(x,y,128,obj_enemy2_shot,true,true) > 0)
   {
      if (side = 1)
      {
         repeat(8)
         {
            script_execute(scr_sideways_right);
         }
      }
      else
      {
         repeat(8)
         {
            script_execute(scr_sideways_left);
         }   
      }       
   }
   else
   {
      if (side = 1)
      {
         repeat(8)
         {
            script_execute(scr_sideways_left);
         }  
      }
      else
      {
         repeat(8)
         {
            script_execute(scr_sideways_right);
         }

      }
   }
}
//Retreat if the enemy is too close.
//do not retreat if looking for an item
   if (backup = 0)
   {
      exit;
   }
   
   
if (point_distance(x,y,tx,ty) <= 128) 
{

   mp_potential_step_object(tx,ty,-8,obj_ships_basic);
}


#define scr_smart_shoot
var tx;
var ty;
var dist;
tx = obj_player.x;
ty = obj_player.y;
//figure out how long a shot will take to get to the player
dist = point_distance(x,y,obj_player.x,obj_player.y)/speed

//determine x position to hit the player
if (obj_player.x > obj_player.xprevious)
{
   tx = obj_player.x + (8*dist);
}
if (obj_player.x < obj_player.xprevious)
{
   tx = obj_player.x - (8*dist);
}

//determine y position to hit the player
if (obj_player.y > obj_player.yprevious)
{
   ty = obj_player.y + (8*dist);
}
if (obj_player.y < obj_player.yprevious)
{
   ty = obj_player.y - (8*dist);
}

direction = point_direction(x,y,tx,ty)
#define scr_phaseup
phase += 1

#define scr_enemy1_movement
//Locate the enemy
if (instance_number(obj_enemy_basic) > 0)
{
   tx = instance_nearest(x,y,obj_good_ship).x;
   ty = instance_nearest(x,y,obj_good_ship).y;
}
else
{
   tx = obj_planet1.x
   ty = obj_planet1.y
}

direction = point_direction(x,y,tx,ty)
move = 0

//Advance if the enemy is becoming far away.
if (point_distance(x,y,tx,ty) >= 32)
{
   mp_potential_step_object(tx,ty,sp,obj_enemy_basic);
   move = 1   
   
}




#define scr_rock_hitside
//determine which side was hit
bounce = 0
//far right
if (x > room_width - 16)
{
   direction= 0-direction-180;
   bounce = 1;
   x = xprevious;
   y = yprevious;

}

//far left
if (x < 16)
{
   if (bounce = 0)
   {
      direction= 180-direction;
      bounce = 1;
      x = xprevious;
      y = yprevious;
   }
   else
   {
      direction -= 180;
   }
   
   
}

//top
if (y < 16)
{
   if (bounce = 0)
   {
      direction= 90-direction-90;
      bounce = 1;
      x = xprevious;
      y = yprevious;
   }
   else
   {
      direction -= 180;
   }
}

//bottom
if (y > 960-16)
{
   if (bounce = 0)
   {
      direction= 270-direction+90;
      bounce = 1;
      x = xprevious;
      y = yprevious;
   }
   else
   {
      direction -= 180;
   }
}
#define script18

