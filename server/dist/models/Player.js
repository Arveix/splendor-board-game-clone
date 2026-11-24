export class Player {
    id;
    name;
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
        };
    }
}
