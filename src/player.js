export class Player {
    constructor(x, y, id, using) {
        this.x = x,
        this.y = y,
        this.id = id,
        this.using = using
    }
    draw(ctx) {
        ctx.beginPath()

        ctx.fillStyle = 'red'
        ctx.fillRect(this.x, this.y, 50, 50)

        ctx.closePath()
    }
}