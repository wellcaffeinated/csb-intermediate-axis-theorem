import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { white, red, blue, grey, pink, mustard } from './colors'

// Ttil = T / (L^2/I2/2)

export function createRollingEllipsoid(resolution = 128) {
  // Create sphere geometry and material
  const geometry = new THREE.SphereGeometry(1, resolution, resolution)
  const material = new THREE.MeshStandardMaterial({
    color: mustard,
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    // depthFunc: THREE.AlwaysDepth,
    side: THREE.DoubleSide,
  })
  // Create sphere mesh
  const ellipsoid = new THREE.Mesh(geometry, material)

  const group = new THREE.Group()
  group.add(ellipsoid)

  const update = (system) => {
    const { I1, I2, I3 } = system
    const T = system.energy
    const Lsq = system.angularMomentum.lengthSq()
    const z = I3 * T / Lsq
    const a = Math.sqrt(z / I1)
    const b = Math.sqrt(z / I2)
    const c = Math.sqrt(z / I3)
    ellipsoid.scale.set(a, b, c)
  }

  const setScale = (scale) => {
    group.scale.set(scale, scale, scale)
  }

  const setOpacity = (o) => {
    ellipsoid.material.opacity = o
  }

  return {
    ellipsoid,
    group,
    setScale,
    setOpacity,
    update,
  }
}

export function createRollingMomentumEllipsoid(resolution = 128) {
  // Create sphere geometry and material
  const geometry = new THREE.SphereGeometry(1, resolution, resolution)
  const material = new THREE.MeshStandardMaterial({
    color: pink,
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    // depthFunc: THREE.AlwaysDepth,
    side: THREE.DoubleSide,
  })
  // Create sphere mesh
  const ellipsoid = new THREE.Mesh(geometry, material)

  const group = new THREE.Group()
  group.add(ellipsoid)

  const update = (system) => {
    const { I1, I2, I3 } = system
    const z = 2
    const a = z / I1
    const b = z / I2
    const c = z / I3
    ellipsoid.scale.set(a, b, c)
  }

  const setScale = (scale) => {
    group.scale.set(scale, scale, scale)
  }

  const setOpacity = (o) => {
    ellipsoid.material.opacity = o
  }

  return {
    ellipsoid,
    group,
    setScale,
    setOpacity,
    update,
  }
}

export function createEllipsoids(resolution = 128) {
  // Create sphere geometry and material
  const geometry = new THREE.SphereGeometry(1, resolution, resolution)
  const material = new THREE.MeshStandardMaterial({
    color: pink,
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    // depthFunc: THREE.AlwaysDepth,
    side: THREE.DoubleSide,
  })

  // Create sphere mesh
  const sphere = new THREE.Mesh(geometry, material)

  // Create sphere geometry and material
  const ellipsoidMaterial = new THREE.MeshStandardMaterial({
    color: white,
    transparent: true,
    opacity: 0.7,
    roughness: 0.2,
    // depthFunc: THREE.AlwaysDepth,
    // side: THREE.DoubleSide,
  })

  // Create sphere mesh
  const ellipsoid = new THREE.Mesh(geometry, ellipsoidMaterial)

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: white,
    transparent: true,
    opacity: 0.5,
    wireframe: true,
  })

  const wfgeo = new THREE.SphereGeometry(1, 16, 16)
  const wf = new THREE.Mesh(wfgeo, wireframeMaterial)

  wf.renderOrder = 1
  sphere.renderOrder = 2
  ellipsoid.renderOrder = 3

  const Tobj = new THREE.Group()
  Tobj.add(wf, ellipsoid)

  const Lobj = new THREE.Group()
  Lobj.add(sphere)

  const group = new THREE.Group()
  group.add(Tobj, Lobj)

  const update = (system) => {
    const { I1, I2, I3 } = system
    const T = system.energy
    const Lsq = system.angularMomentum.lengthSq()
    const z = T / Lsq
    const a = Math.sqrt(z * I1)
    const b = Math.sqrt(z * I2)
    const c = Math.sqrt(z * I3)
    Tobj.scale.set(a, b, c)
  }

  const setScale = (scale) => {
    group.scale.set(scale, scale, scale)
  }

  const setOpacity = (energy = 0.7, momentum = 0.7) => {
    sphere.material.opacity = momentum
    ellipsoid.material.opacity = energy
    wf.material.opacity = energy * energy
  }

  return {
    Tobj,
    Lobj,
    group,
    setScale,
    setOpacity,
    update,
  }
}

export function createEllipsoidView(el) {
  // Create scene, camera and renderer
  const scene = new THREE.Scene()
  const renderer = new THREE.WebGLRenderer()

  const { width, height } = el.getBoundingClientRect()
  el.appendChild(renderer.domElement)

  renderer.setSize(width, height)
  const aspectRatio = width / height
  // const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  const camera = new THREE.OrthographicCamera(
    -1.5 * aspectRatio,
    1.5 * aspectRatio,
    1.5,
    -1.5,
    1,
    1000
  )

  const { update, group } = createEllipsoids()
  group.rotation.set(0, Math.PI / 2, 0)
  scene.add(group)

  // Set camera position
  camera.position.set(0, 20, 0)

  // Add OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement)

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1, 100)
  pointLight.position.set(10, 10, 10)
  scene.add(pointLight)

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
