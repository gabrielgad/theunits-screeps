class ControllerTerminal {
    static execute(roomState) {
        for (const terminal of roomState.terminals) {
            const orders = this.getMarketOrders();
            
            if (orders.length > 0) {
                const bestOrder = this.findBestOrder(orders, terminal);
                if (bestOrder) {
                    this.executeOrder(terminal, bestOrder);
                }
            }
            
            this.balanceResources(terminal, roomState.room);
        }
    }

    static getMarketOrders() {
        return Game.market.getAllOrders(order => 
            order.resourceType === RESOURCE_ENERGY && 
            order.type === ORDER_BUY
        );
    }

    static findBestOrder(orders, terminal) {
        return orders.reduce((best, current) => 
            (current.price > best.price) ? current : best
        );
    }

    static executeOrder(terminal, order) {
        if (terminal.store[order.resourceType] >= order.amount) {
            Game.market.deal(order.id, order.amount, terminal.room.name);
        }
    }

    static balanceResources(terminal, room) {
        const threshold = 5000;
        const energyNeeded = room.energyCapacityAvailable - room.energyAvailable;
        
        if (energyNeeded > threshold) {
            this.requestEnergy(terminal, energyNeeded);
        }
    }

    static requestEnergy(terminal, amount) {
    }
}

module.exports = ControllerTerminal;