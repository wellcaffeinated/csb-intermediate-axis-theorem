import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { white, red, blue, grey, pink, mustard } from './colors'

export function createEllipsoidView(el) {
  // Create scene, camera and renderer
  const scene = new THREE.Scene()
  const renderer = new THREE.WebGLRenderer()

  const { width, height } = el.getBoundingClientRect()
  el.appendChild(renderer.domElement)

  renderer.setSize(width, height)
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)

  // Create sphere geometry and material
  const geometry = new THREE.SphereGeometry(5, 128, 128)
  const material = new THREE.MeshLambertMaterial({
    color: mustard,
    transparent: false,
    opacity: 0.5,
  })

  // Create sphere mesh
  const sphere = new THREE.Mesh(geometry, material)

  // Add sphere to the scene
  scene.add(sphere)

  // Create sphere geometry and material
  const ellipsoidMaterial = new THREE.MeshLambertMaterial({
    color: pink,
    transparent: true,
    opacity: 0.8,
  })

  // Create sphere mesh
  const ellipsoid = new THREE.Mesh(geometry, ellipsoidMaterial)

  // Add sphere to the scene
  scene.add(ellipsoid)

  // Set camera position
  camera.position.set(0, 0, 30)

  // Add OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement)

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1, 100)
  pointLight.position.set(5, 5, 5)
  scene.add(pointLight)

  const update = (omega, L, m1, m2) => {
    const M = 2 * m1 + 2 * m2
    const r = m2 / m1
    const csq = 1 + 1 / r
    const I1 = 2 * m1
    const I2 = 2 * m2
    const I3 = M
    const wx = omega.x
    const wy = omega.y
    const wz = omega.z
    const E = 0.5 * (I1 * wx * wx + I2 * wy * wy + I3 * wz * wz)
    const z = (2 * E) / L / L
    const a = 1
    const b = Math.sqrt((z * I2) / I1)
    const c = Math.sqrt((z * I3) / I1)
    ellipsoid.scale.set(a, b, c)
  }

  // Animate the scene
  const render = () => {
    controls.update()
    renderer.render(scene, camera)
  }

  const destroy = () => {
    renderer.dispose()
    controls.dispose()
  }

  return {
    render,
    update,
    destroy,
  }
}
