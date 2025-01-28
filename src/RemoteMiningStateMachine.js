const RemoteMiningStateMachine = class {
    constructor(room) {
        this.room = room;
        this.memory = room.memory.remoteMining = room.memory.remoteMining || {};
        this.targetRooms = this.memory.targetRooms || [];
        this.memory.miningPositions = this.memory.miningPositions || {};
        this.memory.reserverAssignments = this.memory.reserverAssignments || {};
        this.memory.roomsNeedingScout = this.memory.roomsNeedingScout || [];
        this.memory.profitableRooms = this.memory.profitableRooms || [];
        this.memory.scoutAssignments = this.memory.scoutAssignments || {};
        this.memory.minerAssignments = this.memory.minerAssignments || {};
    }

    run() {
        this.cleanupMemory();
        this.updateCreepAssignments();
        
        for (const targetRoom of this.targetRooms) {
            this.manageRemoteRoom(targetRoom);
        }
    }

    updateCreepAssignments() {
        // Clear stale assignments
        this.memory.scoutAssignments = {};
        this.memory.minerAssignments = {};

        // Update current assignments
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.homeRoom !== this.room.name) continue;

            if (creep.memory.role === 'scout') {
                this.memory.scoutAssignments[creep.memory.targetRoom] = creep.name;
            }
            else if (creep.memory.role === 'remoteMiner') {
                if (!this.memory.minerAssignments[creep.memory.targetRoom]) {
                    this.memory.minerAssignments[creep.memory.targetRoom] = [];
                }
                this.memory.minerAssignments[creep.memory.targetRoom].push(creep.name);
            }
        }
    }

    manageRemoteRoom(targetRoomName) {
        const room = Game.rooms[targetRoomName];
        const hasScout = this.memory.scoutAssignments[targetRoomName];
        
        // If we can't see the room and don't have a scout assigned
        if (!room && !hasScout) {
            this.addRoomNeedingScout(targetRoomName);
            this.removeProfitableRoom(targetRoomName);
            return;
        }

        // If we have a scout assigned but still can't see the room, wait
        if (!room && hasScout) {
            return;
        }

        // Once we can see the room, remove it from scouting needs
        this.removeRoomNeedingScout(targetRoomName);

        if (!this.isRoomSafe(room)) {
            this.abandonRoom(targetRoomName);
            return;
        }

        // Check if room is profitable and needs miners
        if (this.isRoomProfitable(room)) {
            const currentMiners = this.memory.minerAssignments[targetRoomName] 
                ? this.memory.minerAssignments[targetRoomName].length 
                : 0;
            const sources = room.find(FIND_SOURCES);
            
            if (currentMiners < sources.length) {
                this.addProfitableRoom(targetRoomName);
            } else {
                this.removeProfitableRoom(targetRoomName);
            }
        } else {
            this.removeProfitableRoom(targetRoomName);
            this.abandonRoom(targetRoomName);
            return;
        }

        this.manageMiningInfrastructure(room);
        this.manageReserver(targetRoomName);
    }

    addRoomNeedingScout(roomName) {
        if (!this.memory.roomsNeedingScout.includes(roomName)) {
            this.memory.roomsNeedingScout.push(roomName);
        }
    }

    removeRoomNeedingScout(roomName) {
        this.memory.roomsNeedingScout = this.memory.roomsNeedingScout.filter(r => r !== roomName);
    }

    addProfitableRoom(roomName) {
        if (!this.memory.profitableRooms.includes(roomName)) {
            this.memory.profitableRooms.push(roomName);
        }
    }

    removeProfitableRoom(roomName) {
        this.memory.profitableRooms = this.memory.profitableRooms.filter(r => r !== roomName);
    }

    isRoomSafe(room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        return hostiles.length === 0 && hostileStructures.length === 0;
    }

    isRoomProfitable(room) {
        const sources = room.find(FIND_SOURCES);
        const pathToClosestSource = this.room.findPath(this.room.storage.pos, sources[0].pos);
        const distance = pathToClosestSource.length;
        const energyPerTick = sources.length * 10;
        const tripTime = distance * 2;
        return energyPerTick > (tripTime * 0.5);
    }

    getRoomsNeedingScout() {
        return this.memory.roomsNeedingScout;
    }

    getProfitableRooms() {
        return this.memory.profitableRooms;
    }

    getAssignedScouts() {
        return Object.values(this.memory.scoutAssignments);
    }

    getAssignedMiners(roomName) {
        return this.memory.minerAssignments[roomName] || [];
    }

    manageMiningInfrastructure(room) {
        this.manageMiningPositions(room);
    }

    manageMiningPositions(room) {
        const sources = room.find(FIND_SOURCES);
        for (const source of sources) {
            if (!this.memory.miningPositions[source.id]) {
                const miningPos = this.findOptimalMiningPosition(source);
                this.memory.miningPositions[source.id] = miningPos;
            }
        }
    }

    findOptimalMiningPosition(source) {
        const positions = source.room.lookForAtArea(LOOK_TERRAIN, 
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1, true);
        return positions.find(pos => pos.terrain !== 'wall');
    }

    manageReserver(targetRoomName) {
        const room = Game.rooms[targetRoomName];
        if (!room || !room.controller) return;

        const roomState = {
            room: room,
            controller: room.controller,
            reservation: room.controller.reservation
        };

        const reserverCount = _.filter(Game.creeps, 
            creep => creep.memory.role === 'reserver' && 
                    creep.memory.targetRoom === targetRoomName).length;

        const targetCount = CreepReserver.calculateTarget(roomState);

        if (reserverCount < targetCount) {
            room.memory.needsReserver = true;
        }
    }

    cleanupMemory() {
        // Clean up creep memory
        for (const name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }

        // Clean up stale room assignments
        for (const roomName in this.memory.minerAssignments) {
            this.memory.minerAssignments[roomName] = this.memory.minerAssignments[roomName].filter(
                name => Game.creeps[name]
            );
        }

        for (const roomName in this.memory.scoutAssignments) {
            if (!Game.creeps[this.memory.scoutAssignments[roomName]]) {
                delete this.memory.scoutAssignments[roomName];
            }
        }
    }

    addTargetRoom(roomName) {
        if (!this.targetRooms.includes(roomName)) {
            this.targetRooms.push(roomName);
            this.memory.targetRooms = this.targetRooms;
            this.addRoomNeedingScout(roomName);
        }
    }

    removeTargetRoom(roomName) {
        this.targetRooms = this.targetRooms.filter(r => r !== roomName);
        this.memory.targetRooms = this.targetRooms;
        delete this.memory.miningPositions[roomName];
        delete this.memory.reserverAssignments[roomName];
        delete this.memory.minerAssignments[roomName];
        delete this.memory.scoutAssignments[roomName];
        this.removeRoomNeedingScout(roomName);
        this.removeProfitableRoom(roomName);
    }

    abandonRoom(roomName) {
        this.removeTargetRoom(roomName);
    }
}

module.exports = RemoteMiningStateMachine;