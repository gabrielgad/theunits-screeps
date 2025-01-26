const BuildingStateMachine = require('BuildingStateMachine');
const CreepStateMachine = require('CreepStateMachine');
const JobStateMachine = require('JobStateMachine');
const RemoteMiningStateMachine = require('RemoteMiningStateMachine');
const BuildingExecutiveStateMachine = require('BuildingExecutiveStateMachine');

class RoomController {
    constructor(room) {
        this.room = room;
        
        // Initialize all state machines
        this.buildingState = new BuildingStateMachine(room);
        this.creepState = new CreepStateMachine(room);
        this.jobState = new JobStateMachine(room);
        this.remoteMiningState = new RemoteMiningStateMachine(room);
        this.buildingExecState = new BuildingExecutiveStateMachine(room);
    }

    run() {
        // Execute state machines in logical order:
        
        // 2. Then ensure we have the creeps we need
        this.creepState.run();
        
        // 3. Assign and execute jobs for existing creeps
        this.jobState.run();

        // 4. Manages the execution of building operations
        this.buildingExecState.run();
        
        // 5. Plan and manage construction
        this.buildingState.run();

        // 6. Execute potential Remote Mining
        this.remoteMiningState.run();
    }
}

module.exports = RoomController;