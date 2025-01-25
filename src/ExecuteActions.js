const ExecuteHarvest = require('ExecuteHarvest');
const ExecuteStore = require('ExecuteStore');
const ExecuteBuild = require('ExecuteBuild');
const ExecuteUpgrade = require('ExecuteUpgrade');
const ExecuteCollect = require('ExecuteCollect');

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
            default:
                console.log(`Unknown state ${state} for creep ${creep.name}`);
        }
    }
};

module.exports = ExecuteActions;