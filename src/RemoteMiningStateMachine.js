const RemoteMiningStateMachine = class {
    constructor(room) {
        this.room = room;
        this.memory = room.memory.remoteMining = room.memory.remoteMining || {};
        this.targetRooms = this.memory.targetRooms || [];
    }

    run() {
        for (const targetRoom of this.targetRooms) {
            this.manageRemoteRoom(targetRoom);
        }
    }

    manageRemoteRoom(targetRoomName) {
        const room = Game.rooms[targetRoomName];
        
        // Skip if we can't see the room - need to send observer or scout
        if (!room) {
            this.handleUnobservedRoom(targetRoomName);
            return;
        }

        // Check safety and profitability
        if (!this.isRoomSafe(room) || !this.isRoomProfitable(room)) {
            this.abandonRoom(targetRoomName);
            return;
        }

        // Manage mining infrastructure
        this.manageMiningInfrastructure(room);
    }

    handleUnobservedRoom(roomName) {
        // Logic for scouting unseen rooms
        // Could spawn scouts or use observers
    }

    isRoomSafe(room) {
        // Check for hostiles, reserved controllers, etc.
        return true;
    }

    isRoomProfitable(room) {
        // Calculate expected energy income vs creep cost
        return true;
    }

    manageMiningInfrastructure(room) {
        // Manage miners, haulers, and containers
        this.manageMiningPositions(room);
        this.manageHaulingRoutes(room);
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
    }
}

module.exports = RemoteMiningStateMachine;