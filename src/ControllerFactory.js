class ControllerFactory {
    static execute(roomState) {
        for (const factory of roomState.factories) {
            const factoryMemory = Memory.factories[factory.id] || this.initializeMemory(factory);
            
            if (this.shouldProduce(factory, factoryMemory)) {
                const recipe = this.selectRecipe(factory);
                if (recipe) {
                    factory.produce(recipe);
                }
            }
        }
    }

    static initializeMemory(factory) {
        Memory.factories[factory.id] = {
            lastProduction: Game.time,
            currentRecipe: null
        };
        return Memory.factories[factory.id];
    }

    static shouldProduce(factory, memory) {
        return !factory.cooldown && 
               factory.store.getFreeCapacity() > 0 && 
               (Game.time - memory.lastProduction) > 10;
    }

    static selectRecipe(factory) {
        return RESOURCE_BATTERY;
    }
}

module.exports = ControllerFactory;