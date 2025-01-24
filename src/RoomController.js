const EnergyStateMachine = require('EnergyStateMachine');
const BuildingStateMachine = require('BuildingStateMachine');
const CreepStateMachine = require('CreepStateMachine');
const JobStateMachine = require('JobStateMachine');

class RoomController {
    constructor(room) {
        this.room = room;
        
        // Initialize all state machines
        this.energyState = new EnergyStateMachine(room);
        this.buildingState = new BuildingStateMachine(room);
        this.creepState = new CreepStateMachine(room);
        this.jobState = new JobStateMachine(room);
    }

    run() {
        // Execute state machines in logical order:
        
        // 1. First, analyze and manage energy infrastructure
        this.energyState.run();
        
        // 2. Then ensure we have the creeps we need
        this.creepState.run();
        
        // 3. Assign and execute jobs for existing creeps
        this.jobState.run();
        
        // 4. Finally, plan and manage construction
        this.buildingState.run();
    }
}

module.exports = RoomController;