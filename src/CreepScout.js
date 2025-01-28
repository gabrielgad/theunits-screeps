class CreepScout {
    static calculateTarget(roomState) {
        // Need scouts if we don't have room visibility
        return !Game.rooms[roomState.targetRoom] ? 1 : 0;
    }

    static getBody(energy) {
        return [MOVE]; // Simple scout with just movement
    }
}

module.exports = CreepScout;