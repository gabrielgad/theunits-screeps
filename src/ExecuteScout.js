class ExecuteScout {
    static execute(creep) {
        // Skip if no target room assigned
        if (!creep.memory.targetRoom) return;

        // Get room memory from home room's remote mining system
        const homeRoom = Game.rooms[creep.memory.homeRoom];
        if (!homeRoom || !homeRoom.memory.remoteMining) return;

        const remoteMiningMemory = homeRoom.memory.remoteMining;

        // If we're not in the target room, travel there
        if (creep.room.name !== creep.memory.targetRoom) {
            const exitDir = Game.map.findExit(creep.room, creep.memory.targetRoom);
            const exit = creep.pos.findClosestByPath(exitDir);
            creep.moveTo(exit, {
                visualizePathStyle: { stroke: '#ffaa00' },
                reusePath: 50
            });
            return;
        }

        // Once in target room, analyze it
        this.analyzeRoom(creep);

        // Move around the room to get visibility of all important areas
        this.patrolRoom(creep);
    }

    static analyzeRoom(creep) {
        const room = creep.room;
        const homeRoom = Game.rooms[creep.memory.homeRoom];
        
        // Cache analysis results
        if (!creep.memory.roomAnalysis) {
            creep.memory.roomAnalysis = {};
        }

        // Count sources and calculate total energy capacity
        const sources = room.find(FIND_SOURCES);
        creep.memory.roomAnalysis.sourceCount = sources.length;
        
        // Check for hostiles
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        creep.memory.roomAnalysis.isRoomSafe = hostiles.length === 0 && hostileStructures.length === 0;

        // Calculate profitability if we have a storage in home room
        if (homeRoom.storage) {
            const pathToClosestSource = homeRoom.findPath(
                homeRoom.storage.pos,
                sources[0].pos
            );
            const distance = pathToClosestSource.length;
            const energyPerTick = sources.length * 10;
            const tripTime = distance * 2;
            creep.memory.roomAnalysis.isProfitable = energyPerTick > (tripTime * 0.5);
        }

        // Update room controller information
        if (room.controller) {
            creep.memory.roomAnalysis.hasController = true;
            creep.memory.roomAnalysis.controllerLevel = room.controller.level;
            creep.memory.roomAnalysis.isReserved = room.controller.reservation !== undefined;
        }

        // Report findings back to remote mining system
        if (homeRoom.memory.remoteMining) {
            const remoteMiningMemory = homeRoom.memory.remoteMining;
            
            // Store source positions for future miners
            if (!remoteMiningMemory.miningPositions) {
                remoteMiningMemory.miningPositions = {};
            }
            
            sources.forEach(source => {
                if (!remoteMiningMemory.miningPositions[source.id]) {
                    const positions = room.lookForAtArea(
                        LOOK_TERRAIN,
                        source.pos.y - 1,
                        source.pos.x - 1,
                        source.pos.y + 1,
                        source.pos.x + 1,
                        true
                    );
                    const miningPos = positions.find(pos => pos.terrain !== 'wall');
                    if (miningPos) {
                        remoteMiningMemory.miningPositions[source.id] = miningPos;
                    }
                }
            });
        }
    }

    static patrolRoom(creep) {
        // If we haven't initialized patrol points, do so
        if (!creep.memory.patrolPoints) {
            const sources = creep.room.find(FIND_SOURCES);
            creep.memory.patrolPoints = sources.map(source => ({
                x: source.pos.x,
                y: source.pos.y
            }));
            
            // Add controller to patrol points if it exists
            if (creep.room.controller) {
                creep.memory.patrolPoints.push({
                    x: creep.room.controller.pos.x,
                    y: creep.room.controller.pos.y
                });
            }
            
            creep.memory.currentPatrolPoint = 0;
        }

        // Move to current patrol point
        const target = creep.memory.patrolPoints[creep.memory.currentPatrolPoint];
        if (creep.pos.getRangeTo(target.x, target.y) > 3) {
            creep.moveTo(target.x, target.y, {
                visualizePathStyle: { stroke: '#ffffff' },
                reusePath: 20
            });
        } else {
            // Move to next patrol point
            creep.memory.currentPatrolPoint = 
                (creep.memory.currentPatrolPoint + 1) % creep.memory.patrolPoints.length;
        }
    }
}

module.exports = ExecuteScout;