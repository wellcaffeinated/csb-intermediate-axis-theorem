import * as THREE from 'three'
import { white, red, blue, grey, pink, mustard } from './colors'

export function createKissingSpheres(resolution = 128) {
  // Create sphere geometry and material
  const geometry = new THREE.SphereGeometry(1, resolution, resolution)
  const material = new THREE.MeshStandardMaterial({
    color: white,
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    // depthFunc: THREE.AlwaysDepth,
    side: THREE.DoubleSide,
  })

  // Create sphere mesh
  const outer = new THREE.Mesh(geometry, material)

  // Create sphere geometry and material
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: red,
    transparent: true,
    opacity: 0.7,
    roughness: 0.2,
    // depthFunc: THREE.AlwaysDepth,
    // side: THREE.DoubleSide,
  })

  // Create sphere mesh
  const lower = new THREE.Mesh(geometry, innerMaterial)
  const upper = new THREE.Mesh(geometry, innerMaterial)

  lower.renderOrder = 1
  upper.renderOrder = 2
  outer.renderOrder = 3

  const group = new THREE.Group()
  group.add(outer, lower, upper)

  const update = (system) => {
    const { I1, I2, I3 } = system
    const L = system.angularMomentum
    const Lmag = L.length()
    const router = 1 / I1 - 1 / I3
    const rupper = 1 / I1 - 1 / I2
    const rlower = 1 / I2 - 1 / I3
    outer.scale.set(router, router, router)
    upper.scale.set(rupper, rupper, rupper)
    lower.scale.set(rlower, rlower, rlower)
    outer.position.copy(L).multiplyScalar((1 / I1 + 1 / I3) / Lmag)
    upper.position.copy(L).multiplyScalar((1 / I1 + 1 / I2) / Lmag)
    lower.position.copy(L).multiplyScalar((1 / I2 + 1 / I3) / Lmag)
  }

  const setScale = (scale) => {
    group.scale.set(scale, scale, scale)
  }

  const setOpacity = (outside, inside) => {
    outer.material.opacity = outside
    lower.material.opacity = inside
    upper.material.opacity = inside
  }

  return {
    group,
    setScale,
    setOpacity,
    update,
  }
}
