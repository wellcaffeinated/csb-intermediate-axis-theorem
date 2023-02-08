import { createCanvas, createView } from '@wellcaffeinated/view-draw'

const arrowProps = { stroke: 2, headSize: 12 }
const view = createView(
  'polar',
  [0, 1.15, Math.PI, -Math.PI],
  (draw, state) => {
    draw.color('#00fdf8').arrow([0, 0], [1, state.angle], arrowProps)
  }
)

export function createPendulumView(el) {
  const { canvas, destroy } = createCanvas({ el })

  const update = (state) => {
    view.draw(canvas, state)
  }

  return {
    update,
    destroy,
  }
}
