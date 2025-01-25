const ExecuteHarvest = require('ExecuteHarvest');
const ExecuteStore = require('ExecuteStore');
const ExecuteBuild = require('ExecuteBuild');
const ExecuteUpgrade = require('ExecuteUpgrade');
const ExecuteCollect = require('ExecuteCollect');
const ExecuteRepair = require('ExecuteRepair');
const ExecutePickup = require('ExecutePickup');
const ExecuteDeliver = require('ExecuteDeliver');

const ExecuteActions = {
    executeState(creep, state) {
        switch(state) {
            case 'HARVEST':
                return ExecuteHarvest.execute(creep);
            case 'STORE':
                return ExecuteStore.execute(creep);
            case 'BUILD':
                return ExecuteBuild.execute(creep);
            case 'UPGRADE':
                return ExecuteUpgrade.execute(creep);
            case 'COLLECT':
                return ExecuteCollect.execute(creep);
            case 'REPAIR':
                return ExecuteRepair.execute(creep);
            case 'PICKUP':
                return ExecutePickup.execute(creep);
            case 'DELIVER':
                return ExecuteDeliver.execute(creep);
            default:
                console.log(`Unknown state ${state} for creep ${creep.name}`);
        }
    }
};

module.exports = ExecuteActions;