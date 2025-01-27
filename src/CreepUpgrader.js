class CreepUpgrader {
    static calculateTarget(roomState) {
        const body = this.getBody(roomState.energyCapacity);
        const workParts = body.filter(part => part === WORK).length;
        
        // Base number on RCL
        let count = Math.ceil(roomState.roomLevel / 2);
        
        // Increase for RCL 8 rush
        if (roomState.roomLevel === 7 && roomState.room.controller.progress / roomState.room.controller.progressTotal > 0.8) {
            count += 1;
        }
        
        return Math.min(count, 3);
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },                    // Basic upgrader
            { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },       // More resources
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }, // More upgrade power
            { cost: 500, body: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE] }, // More carrying
            { cost: 600, body: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE] }, // More work
            { cost: 700, body: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] }, // Balanced
            { cost: 800, body: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE] } // Max upgrade focus
        ];

        const selected = bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]);
        return selected.body;
    }
}

module.exports = CreepUpgrader;