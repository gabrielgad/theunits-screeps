const RemoteMiningStateMachine = class {
    constructor(room) {
        this.room = room;
        this.memory = room.memory.remoteMining = room.memory.remoteMining || {};
        this.targetRooms = this.memory.targetRooms || [];
        this.memory.miningPositions = this.memory.miningPositions || {};
        this.memory.reserverAssignments = this.memory.reserverAssignments || {};
    }

    run() {
        for (const targetRoom of this.targetRooms) {
            this.manageRemoteRoom(targetRoom);
        }
        this.cleanupMemory();
    }

    manageRemoteRoom(targetRoomName) {
        const room = Game.rooms[targetRoomName];
        
        if (!room) return;

        if (!this.isRoomSafe(room) || !this.isRoomProfitable(room)) {
            this.abandonRoom(targetRoomName);
            return;
        }

        this.manageMiningInfrastructure(room);
        this.manageReserver(targetRoomName);
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
            // The actual spawning will be handled by the CreepStateMachine
            room.memory.needsReserver = true;
        }
    }

    cleanupMemory() {
        for (const name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }

    addTargetRoom(roomName) {
        if (!this.targetRooms.includes(roomName)) {
            this.targetRooms.push(roomName);
            this.memory.targetRooms = this.targetRooms;
        }
    }

    removeTargetRoom(roomName) {
        this.targetRooms = this.targetRooms.filter(r => r !== roomName);
        this.memory.targetRooms = this.targetRooms;
        delete this.memory.miningPositions[roomName];
        delete this.memory.reserverAssignments[roomName];
    }
}

module.exports = RemoteMiningStateMachine;