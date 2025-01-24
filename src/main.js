const RoomController = require('RoomController');

// We store our room controllers globally so they persist between ticks
global.roomControllers = global.roomControllers || {};

module.exports.loop = function() {
    // Clean up memory from any dead creeps
    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
    
    // Run the controller for each room we own
    for(let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if(room.controller && room.controller.my) {
            // Initialize controller if it doesn't exist
            if(!global.roomControllers[roomName]) {
                global.roomControllers[roomName] = new RoomController(room);
            }
            // Run the room's control logic
            global.roomControllers[roomName].run();
        }
    }
};