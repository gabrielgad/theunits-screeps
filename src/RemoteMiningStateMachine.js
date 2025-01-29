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
        this.memory.lastRoomScan = this.memory.lastRoomScan || 0;
        this.memory.active = this.memory.active || false; // Track if remote mining is active
    }

    run() {
        this.cleanupMemory();
        
        // Auto-scan for new rooms every 1000 ticks if remote mining is active
        if (this.memory.active && Game.time - this.memory.lastRoomScan > 1000) {
            this.scanForNewTargetRooms();
            this.memory.lastRoomScan = Game.time;
        }
        
        for (const targetRoom of this.targetRooms) {
            this.manageRemoteRoom(targetRoom);
        }

        // Update active status based on current state
        this.updateActiveStatus();
    }

    updateActiveStatus() {
        // Remote mining is considered active if we have any target rooms
        // or if we're actively scanning for new ones
        const hasTargetRooms = this.targetRooms.length > 0;
        const hasRoomsNeedingScout = this.memory.roomsNeedingScout.length > 0;
        const hasProfitableRooms = this.memory.profitableRooms.length > 0;
        
        this.memory.active = hasTargetRooms || hasRoomsNeedingScout || hasProfitableRooms;
    }

    activate() {
        this.memory.active = true;
        // Initial scan when activated
        this.scanForNewTargetRooms();
    }

    deactivate() {
        this.memory.active = false;
        // Clear all target rooms when deactivated
        this.targetRooms.slice().forEach(room => this.removeTargetRoom(room));
    }

    scanForNewTargetRooms() {
        // Get exits from current room
        const exits = Game.map.describeExits(this.room.name);
        const maxTargetRooms = 3; // Limit number of target rooms
        
        // Skip if we already have maximum target rooms
        if (this.targetRooms.length >= maxTargetRooms) return;

        for (const exitDirection in exits) {
            const roomName = exits[exitDirection];
            
            // Skip if room is already a target
            if (this.targetRooms.includes(roomName)) continue;
            
            // Check if room is suitable for mining
            if (this.isRoomSuitableForMining(roomName)) {
                this.addTargetRoom(roomName);
                
                // Break if we've reached the maximum
                if (this.targetRooms.length >= maxTargetRooms) break;
            }
        }
    }

    isRoomSuitableForMining(roomName) {
        // Check if room exists and is accessible
        if (!Game.map.isRoomAvailable(roomName)) return false;

        // Get room status
        const roomStatus = Game.map.getRoomStatus(roomName);
        if (!roomStatus || roomStatus.status !== 'normal') return false;

        // Check if room is owned or reserved
        const roomInfo = Game.map.getRoomCache(roomName) || {};
        if (roomInfo.owner || roomInfo.reservation) return false;

        // If we can see the room, do additional checks
        const room = Game.rooms[roomName];
        if (room) {
            // Check for hostile structures or creeps
            if (!this.isRoomSafe(room)) return false;

            // Check if room has sources
            const sources = room.find(FIND_SOURCES);
            if (!sources.length) return false;

            // Check if the room would be profitable
            if (!this.isRoomProfitable(room)) return false;
        }

        // Calculate linear distance to evaluate if room is too far
        const [currentX, currentY] = this.parseRoomName(this.room.name);
        const [targetX, targetY] = this.parseRoomName(roomName);
        const distance = Math.abs(currentX - targetX) + Math.abs(currentY - targetY);
        
        // Reject rooms that are too far away (more than 1 room distance)
        if (distance > 1) return false;

        return true;
    }

    parseRoomName(roomName) {
        const match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
        if (!match) return [0, 0];
        
        const x = (match[1] === 'W' ? -1 : 1) * Number(match[2]);
        const y = (match[3] === 'N' ? 1 : -1) * Number(match[4]);
        return [x, y];
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
        this.updateActiveStatus();
    }
}

module.exports = RemoteMiningStateMachine;