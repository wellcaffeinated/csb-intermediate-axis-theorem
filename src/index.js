import './styles.css'

import * as THREE from 'three'
import { Easing, Util } from 'intween'
import GUI from 'lil-gui'
import store from 'store'
import { createPendulumView } from './pendulum'
import {
  createEllipsoidView,
  createEllipsoids,
  createRollingEllipsoid,
  createRollingMomentumEllipsoid,
} from './ellipsoid'

import Stats from 'three/examples/jsm/libs/stats.module.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'

import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

import { createSystem } from './physics'
import { Group, Vector2, Vector3 } from 'three'
import { Trail } from './trails'
import { white, red, blue, grey, pink, mustard, orange } from './colors'

import { $GC, $, $$ } from './slick-csb'
import { createKissingSpheres } from './kissing-spheres'

const gc = $GC(module)

const ARROW_LENGTH = 180

let container, stats, controls

let renderer
const View = {}

function massSizeScale(m) {
  return Math.sqrt(m) * 10
}

function createMass(
  pos = { x: 0, y: 0, z: 0 },
  { roughness = 0.5, metalness = 0.5 },
  color = grey
) {
  const geometry = new THREE.SphereGeometry(1, 32, 16)

  const material = new THREE.MeshStandardMaterial({
    bumpScale: 1,
    color: color,
    metalness,
    roughness,
    envMap: null,
    // side: THREE.FrontSide,
    // shadowSide: THREE.FrontSide,
    dithering: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(pos.x, pos.y, pos.z)
  mesh.castShadow = true
  mesh.receiveShadow = true

  return { mesh, geometry, material, color }
}

function createSpinner(texture) {
  // texture.mapping = THREE.EquirectangularReflectionMapping;
  const group = new THREE.Group()
  const props = { roughness: 0.7, metalness: 0.5 }

  const massRed1 = createMass({ x: 100, y: 0, z: 0 }, props, red)
  const massRed2 = createMass({ x: -100, y: 0, z: 0 }, props, red)
  const massBlue1 = createMass({ x: 0, y: 100, z: 0 }, props, blue)
  const massBlue2 = createMass({ x: 0, y: -100, z: 0 }, props, blue)
  const massGrey1 = createMass({ x: 0, y: 0, z: 100 }, props, grey)
  const massGrey2 = createMass({ x: 0, y: 0, z: -100 }, props, grey)

  const masses = [massRed1, massRed2, massBlue1, massBlue2, massGrey1, massGrey2]

  group.add(...masses.map((m) => m.mesh))

  const geometry = new THREE.BoxGeometry(200, 200, 200)
  const material = new THREE.MeshStandardMaterial({
    // bumpScale: 1,
    color: white,
    metalness: 0.5,
    roughness: 0.9,
    envMap: null,
    // side: THREE.FrontSide,
    // shadowSide: THREE.FrontSide,
    dithering: true,
  })
  const plate = new THREE.Mesh(geometry, material)
  plate.castShadow = true
  plate.receiveShadow = true
  plate.rotation.set(0, 0, 0)
  group.add(plate)

  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 100, 32)
  const rod1 = new THREE.Mesh(cyl, material)
  rod1.castShadow = true
  rod1.receiveShadow = true
  rod1.rotation.set(0, 0, 0)
  rod1.position.set(0, 50, 0)
  const rod2 = new THREE.Mesh(cyl, material)
  rod2.castShadow = true
  rod2.receiveShadow = true
  rod2.rotation.set(0, 0, 0)
  rod2.position.set(0, -50, 0)
  const rodsBlue = new THREE.Group()
  rodsBlue.add(rod1, rod2)
  group.add(rodsBlue)

  const rodg1 = new THREE.Mesh(cyl, material)
  rodg1.castShadow = true
  rodg1.receiveShadow = true
  rodg1.rotation.set(0, 0, 0)
  rodg1.position.set(0, 50, 0)
  const rodg2 = new THREE.Mesh(cyl, material)
  rodg2.castShadow = true
  rodg2.receiveShadow = true
  rodg2.rotation.set(0, 0, 0)
  rodg2.position.set(0, -50, 0)
  const rodsGrey = new THREE.Group()
  rodsGrey.rotation.set(Math.PI / 2, 0, 0)
  rodsGrey.add(rodg1, rodg2)
  group.add(rodsGrey)

  // const axesHelper = new THREE.AxesHelper(500)
  // group.add(axesHelper)

  const setRotation = (x = 0, y = 0, z = 0) => {
    group.rotation.set(x, y, z)
  }

  const setOrientation = (quaternion) => {
    group.rotation.setFromQuaternion(quaternion)
  }

  const setMasses = (m1, m2, m3) => {
    const sx = massSizeScale(m1)
    massRed1.mesh.scale.set(sx, sx, sx)
    massRed2.mesh.scale.set(sx, sx, sx)

    const sy = massSizeScale(m2)
    massBlue1.mesh.scale.set(sy, sy, sy)
    massBlue2.mesh.scale.set(sy, sy, sy)

    const sz = massSizeScale(m3)
    massGrey1.mesh.scale.set(sz, sz, sz)
    massGrey2.mesh.scale.set(sz, sz, sz)

    plate.scale.set(1, m2 / m1, m3 / m1 + 1 / 50)
    rodsGrey.visible = !!m3
  }

  const setSingleSided = (toggle) => {
    massRed2.mesh.visible = !toggle
    massBlue2.mesh.visible = !toggle
    rod2.visible = !toggle
  }

  setMasses(1, 1)

  // scene.background = texture
  return {
    group,
    setRotation,
    setMasses,
    setSingleSided,
    setOrientation,
  }
}

function init() {
  container = document.createElement('div')
  document.body.appendChild(container)

  View.scene = new THREE.Scene()
  View.scene.background = white
  View.scene.fog = new THREE.Fog(white, 1000, 5000)
  View.layout = new THREE.Group()
  View.layout.rotation.set(-Math.PI / 2, 0, 0)
  View.layoutQ = new THREE.Quaternion().setFromEuler(View.layout.rotation)
  View.scene.add(View.layout)

  View.Jframe = new THREE.Object3D()
  View.layout.add(View.Jframe)

  View.omegaFrame = new THREE.Object3D()
  View.layout.add(View.omegaFrame)

  // camera
  View.camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    100,
    4000
  )
  // View.camera.up.set(0, 0, 1)
  View.camera.position.set(600, 400, -400)
  View.cameraContainer = new THREE.Group()
  View.cameraContainer.add(View.camera)
  View.scene.add(View.cameraContainer)
  View.camera.lookAt(View.scene.position)

  // ellipsoids
  View.ellipsoids = createEllipsoids(256)
  View.ellipsoids.group.rotation.set(0, 0, 0)

  View.rollingEllipsoid = createRollingEllipsoid()
  View.rollingEllipsoid.group.rotation.copy(View.ellipsoids.group.rotation)
  View.rollingEllipsoid.group.renderOrder = 1

  const plane = new THREE.Plane(new THREE.Vector3(1, 1, 1), 0)
  const helper = new THREE.PlaneHelper(plane, 1000, 0x000000)
  helper.children[0].material.side = THREE.DoubleSide
  // helper.rotation.set(Math.PI / 2, Math.PI / 2, 0)
  View.omegaPlane = helper
  View.scene.add(helper)

  View.rollingMomentumEllipsoid = createRollingMomentumEllipsoid()
  View.rollingMomentumEllipsoid.group.rotation.copy(View.ellipsoids.group.rotation)
  // spinner

  View.spinner = createSpinner()
  View.spinner.group.add(
    View.ellipsoids.group,
    View.rollingEllipsoid.group,
    View.rollingMomentumEllipsoid.group
  )
  View.layout.add(View.spinner.group)

  View.kissingSpheres = createKissingSpheres()
  View.layout.add(View.kissingSpheres.group)

  // arrows
  View.angMomArrow = new THREE.ArrowHelper(
    new THREE.Vector3(),
    View.layout.position,
    ARROW_LENGTH,
    pink
  )
  View.layout.add(View.angMomArrow)
  View.omegaArrow = new THREE.ArrowHelper(
    new THREE.Vector3(),
    View.layout.position,
    ARROW_LENGTH,
    mustard
  )
  View.layout.add(View.omegaArrow)

  View.x1Arrow = new THREE.ArrowHelper(
    new THREE.Vector3(),
    View.layout.position,
    50,
    red
  )
  View.layout.add(View.x1Arrow)
  View.x2Arrow = new THREE.ArrowHelper(
    new THREE.Vector3(),
    View.layout.position,
    50,
    blue
  )
  View.layout.add(View.x2Arrow)

  // trails
  View.trailsGroup = new THREE.Group()
  View.layout.add(View.trailsGroup)
  View.x1Trail = Trail({
    renderer,
    throttleDistance: 0.01,
    maxSize: 1000,
    maxDistance: 10,
    color: red,
  })
  View.x1Trail.mesh.scale.set(100, 100, 100)
  View.trailsGroup.add(View.x1Trail.mesh)

  View.x2Trail = Trail({
    renderer,
    throttleDistance: 0.01,
    maxSize: 1000,
    maxDistance: 10,
    color: blue,
  })
  View.x2Trail.mesh.scale.set(100, 100, 100)
  View.trailsGroup.add(View.x2Trail.mesh)

  View.jTrail = Trail({
    renderer,
    throttleDistance: 0.01,
    maxSize: 1000,
    maxDistance: 10,
    color: pink,
  })
  View.jTrail.mesh.scale.set(180, 180, 180)
  View.trailsGroup.add(View.jTrail.mesh)

  View.omegaTrail = Trail({
    renderer,
    throttleDistance: 0.01,
    maxSize: 1000,
    maxDistance: 10,
    color: mustard,
  })
  View.omegaTrail.mesh.scale.set(180, 180, 180)
  View.trailsGroup.add(View.omegaTrail.mesh)

  // Lights

  const light = new THREE.DirectionalLight(0xffffdd, 0.9)
  light.position.x = 100
  light.position.y = 550
  light.position.z = -200

  light.castShadow = true
  light.shadow.camera.near = 0.1
  light.shadow.camera.far = 2000
  light.shadow.camera.right = 1000
  light.shadow.camera.left = -1000
  light.shadow.camera.top = 1000
  light.shadow.camera.bottom = -1000
  light.shadow.mapSize.width = 512 * 16
  light.shadow.mapSize.height = 512 * 16
  light.shadow.radius = 1
  light.shadow.normalBias = 0
  // light.shadow.samples = 10
  light.shadow.bias = 0.0006

  View.scene.add(light)

  //

  // ground
  const geometry = new THREE.PlaneGeometry(8000, 8000)
  const material = new THREE.MeshStandardMaterial({
    bumpScale: 1,
    color: 0xa6f858,
    metalness: 0.1,
    roughness: 0.9,
    envMap: null,
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.position.y = -240
  ground.rotation.set(-Math.PI / 2, 0, 0)
  ground.receiveShadow = true
  View.scene.add(ground)
  View.ground = ground

  // sky

  const vertexShader = `
    varying vec3 vWorldPosition;

    void main() {
      vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;

    varying vec3 vWorldPosition;

    void main() {

      float h = normalize( vWorldPosition + offset ).y;
      gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) ), 1.0 );

    }
  `
  const uniforms = {
    topColor: { value: new THREE.Color(0xffffff) },
    bottomColor: { value: new THREE.Color(0x23a4db) },
    offset: { value: 500 },
    exponent: { value: 0.5 },
  }
  uniforms.topColor.value.copy(light.color)

  const skyGeo = new THREE.SphereGeometry(2000, 64, 15)
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide,
  })

  View.sky = new THREE.Mesh(skyGeo, skyMat)
  View.scene.add(View.sky)

  View.scene.add(new THREE.AmbientLight(0xffffdd, 0.9))

  const hemisphereLight = new THREE.HemisphereLight(light.color, 0x23a4db, 0.9)
  View.scene.add(hemisphereLight)

  // axes helper
  View.axesHelper = new THREE.AxesHelper(200)
  View.layout.add(View.axesHelper)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.autoClear = false
  renderer.setClearColor(View.scene.fog.color)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.appendChild(renderer.domElement)

  renderer.outputEncoding = THREE.sRGBEncoding
  // renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.7
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.physicallyCorrectLights = true
  // renderer.physicallyBasedShading = true

  View.composer = new EffectComposer(renderer)
  View.renderPass = new RenderPass(View.scene, View.camera)
  View.composer.addPass(View.renderPass)

  // View.saoPass = new SAOPass(View.scene, View.camera, false, true)
  // View.saoPass.params = Object.assign(View.saoPass.params, {
  //   saoBias: 0,
  //   saoIntensity: 0.0004,
  //   saoScale: 3,
  //   saoKernelRadius: 16,
  //   saoBlur: 1,
  //   saoBlurRadius: 1,
  //   saoBlurStdDev: 0.05,
  //   saoBlurDepthCutoff: 0.05,
  // })
  // View.composer.addPass( View.saoPass )

  const ssaoPass = new SSAOPass(
    View.scene,
    View.camera,
    window.innerWidth,
    window.innerHeight
  )
  ssaoPass.kernelSize = 4
  ssaoPass.kernelRadius = 8
  ssaoPass.minDistance = 0.001
  ssaoPass.maxDistance = 0.025
  // ssaoPass.ssaoMaterial.uniforms[ 'cameraNear' ].value = 0.01
  ssaoPass.ssaoMaterial.uniforms['cameraFar'].value = 6000
  // View.composer.addPass(ssaoPass)

  View.fxaaPass = new ShaderPass(FXAAShader)
  View.fxaaPass.material.uniforms['resolution'].value.x =
    1 / (window.innerWidth * renderer.getPixelRatio())
  View.fxaaPass.material.uniforms['resolution'].value.y =
    1 / (window.innerHeight * renderer.getPixelRatio())
  View.composer.addPass(View.fxaaPass)
  // const smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio() )
  // View.composer.addPass(smaaPass)
  const copyPass = new ShaderPass(CopyShader)
  View.composer.addPass(copyPass)

  //

  stats = new Stats()
  container.appendChild(stats.dom)

  // View.camera.up.set(0, 0, 1)
  controls = new OrbitControls(View.camera, renderer.domElement)
  controls.minDistance = 400
  controls.maxDistance = 2000
  controls.rotateSpeed = 1.0
  controls.zoomSpeed = 1.2
  controls.panSpeed = 0.8
  controls.enableDamping = true
  controls.dampingFactor = 0.2
}

function onWindowResize() {
  const width = window.innerWidth
  const height = window.innerHeight
  View.camera.aspect = width / height
  View.camera.updateProjectionMatrix()

  View.fxaaPass.material.uniforms['resolution'].value.x =
    1 / (width * renderer.getPixelRatio())
  View.fxaaPass.material.uniforms['resolution'].value.y =
    1 / (height * renderer.getPixelRatio())

  renderer.setSize(width, height)
  View.composer.setSize(width, height)
}

const n = new THREE.Vector3()
const setArrow = (obj, v, setLength = false, scale = 1) => {
  n.copy(v)
  if (n.lengthSq() !== 0) {
    if (setLength) {
      obj.setLength(
        scale * n.length() * ARROW_LENGTH,
        0.2 * ARROW_LENGTH,
        0.04 * ARROW_LENGTH
      )
    } else {
      obj.setLength(scale * ARROW_LENGTH)
    }
    obj.setDirection(n.normalize())
    obj.visible = true
  } else {
    obj.visible = false
  }
}

const cameraOrientator = (target, cameraOrContainer, duration = 1000) => {
  const el = cameraOrContainer
  const camera = el.isCamera ? el : el.children.find((c) => c.isCamera)
  const q = el.quaternion.clone()
  const qe = new THREE.Quaternion()
  let start = -1
  return (time = performance.now()) => {
    if (start < 0) {
      start = time
      q.copy(el.quaternion)
      return
    }
    const k = Util.invLerpClamped(start, start + duration, time)
    target.updateMatrixWorld()
    el.quaternion.slerpQuaternions(
      q,
      qe.setFromRotationMatrix(target.matrixWorld),
      Easing.quadOut(k)
    )
    camera.up.set(0, 1, 0).applyQuaternion(el.quaternion)
  }
}

const match = (sel, cases) => (cases[sel] || cases['default'] || (() => {}))()

function getPresetNames() {
  return Array.from(store.get('presets') || [])
}

function savePreset(name, obj) {
  if (!name) {
    return
  }
  const names = getPresetNames()
  names.push(name)
  store.set('presets', Array.from(new Set(names)))
  store.set(`preset:${name}`, obj)
}

function loadPreset(name) {
  return store.get(`preset:${name}`)
}

function makeGui(onChange) {
  let presetList = getPresetNames()
  const frameChoices = ['world', 'J', 'J up', 'body', 'omega_0']
  let pauseCtrl
  let loadPresetCtrl
  let currentPresetCtrl
  const rootGui = new GUI()

  rootGui
    .addFolder('Reset')
    .close()
    .add({ reset: () => gui.reset() }, 'reset')

  const gui = rootGui.addFolder('Simulation')

  const onLoadPreset = (name) => {
    const obj = loadPreset(name)
    if (!obj) {
      return
    }
    gui.load(obj)
    presetState.preset = name
    currentPresetCtrl.updateDisplay()
  }

  const presetState = {
    preset: '',
    loadPreset: '(select)',
    savePreset: () => {
      const name = presetState.preset
      if (!name || name === '(select)') {
        return
      }
      savePreset(name, gui.save())
      presetList = getPresetNames()
      presetState.loadPreset = name
      loadPresetCtrl = loadPresetCtrl.options(presetList).onChange(onLoadPreset)
    },
  }

  const presets = rootGui.addFolder('Presets') //.close()
  presets.add(presetState, 'savePreset').name('Save')
  currentPresetCtrl = presets.add(presetState, 'preset')
  loadPresetCtrl = presets
    .add(presetState, 'loadPreset', presetList)
    .name('Load Preset')
    .onChange(onLoadPreset)

  const Xaxis = new Vector3(1, 0, 0)
  const Yaxis = new Vector3(0, 1, 0)
  const deg = Math.PI / 180

  const state = {
    psi: 0,
    chi: 0,
    r: 0.5,
    q: 0,
    w_x: 1e-6,
    w_y: 0,
    w_z: 0.005,
    get omega() {
      const omega = new Vector3(state.w_x, state.w_y, state.w_z)
      omega.applyAxisAngle(Xaxis, state.chi * deg)
      omega.applyAxisAngle(Yaxis, -state.psi * deg)
      return omega
    },
    L: 0.013,
    energy_scale: 1,
    frame: frameChoices[0],
    showXVecs: true,
    showAxes: true,
    showBg: true,
    singleSidedMasses: false,

    showOmegaPlane: false,
    showEllipsoids: false,
    ELopacity: 0.7,
    LLopacity: 0.7,
    showRollingEllipsoid: false,
    Ewopacity: 0.5,
    showRollingMomentumEllipsoid: false,
    Lwopacity: 0.5,
    showKissingSpheres: false,
    kissInnerOpacity: 0.7,
    kissOuterOpacity: 0.5,

    showPV: true,
    whichPVTrails: 0,
    trailsFrame: 'match',
    showBodyTrails: true,
    whichBodyTrails: 0,
    trailLength: 10,
    showOmega: true,
    showJ: true,
    normalizedArrows: false,
    arrowScale: 1,
    paused: true,
    togglePause: () => {
      state.paused = !state.paused
      pauseCtrl.name(state.paused ? 'Play' : 'Pause')
      onChange({ object: state, property: 'paused', value: state.paused })
    },
    angularMomentum: 0, // view only
  }

  const setOmegaFromEnergy = () => {
    const M = 4
    const m1 = M / (state.r + 1)
    const m2 = state.r * m1
    const csq = 1 + 1 / state.r
    // const Ttil = state.energy_scale //
    const Ttilmin = 1 / csq
    const Ttil = THREE.MathUtils.lerp(Ttilmin, 1, state.energy_scale)
    const L = state.L
    const I1 = M / csq
    const lambda = (0.5 * L * L) / I1
    const h = (2 * state.r * lambda) / I1
    const w1sq = h * csq * (Ttil - Ttilmin)
    const w3sq = (h / csq) * (1 - Ttil)
    state.w_x = Math.sqrt(w1sq)
    state.w_y = 0
    state.w_z = Math.sqrt(w3sq)
  }

  const cameraFolder = gui.addFolder('Camera').close()
  cameraFolder.add(View.camera.position, 'x')
  cameraFolder.add(View.camera.position, 'y')
  cameraFolder.add(View.camera.position, 'z')

  const initialConditions = gui.addFolder('Initial Conditions')

  let rCtrl
  let qCtrl
  const onMassRatioUpdate = () => {
    // const c = Math.sqrt(1 + state.r)
    // const Ttilmin = 1 / c / c
    // escalectrl.min(Ttilmin)
    // escalectrl.setValue(Math.max(state.energy_scale, Ttilmin))
    rCtrl.min(Math.max(state.q, 0.02))
    qCtrl.max(state.r)
    rCtrl.updateDisplay()
    qCtrl.updateDisplay()
    setOmegaFromEnergy()
  }

  initialConditions.add(state, 'psi', 0, 180, 1)
  initialConditions.add(state, 'chi', 0, 180, 1)
  initialConditions.add(state, 'L', 0, 0.03, 0.001).name('L')
  rCtrl = initialConditions
    .add(state, 'r', 0.02, 1, 0.01)
    .name('mass ratio m2/m1')
    .onChange(onMassRatioUpdate)
  qCtrl = initialConditions
    .add(state, 'q', 0, state.r, 0.01)
    .name('mass ratio m3/m1')
    .onChange(onMassRatioUpdate)
  const escalectrl = initialConditions
    .add(state, 'energy_scale', 0, 1, 0.001)
    .name('energy amount')

  initialConditions
    .add(
      {
        fn() {
          escalectrl.setValue(state.r * state.r)
        },
      },
      'fn'
    )
    .name('Set to instability')
  onMassRatioUpdate()

  const omega = gui.addFolder('Angular Velocity').close()
  omega.add(state, 'w_x', -0.02, 0.02, 1e-6).listen()
  omega.add(state, 'w_y', -0.02, 0.02, 1e-6).listen()
  omega.add(state, 'w_z', -0.02, 0.02, 1e-6).listen()

  const look = gui.addFolder('View Options')
  look
    .add(state, 'singleSidedMasses')
    .name('Single Sided Masses')
    .onChange((toggle) => {
      View.spinner.setSingleSided(toggle)
    })
  look.add(state, 'showAxes').name('axes')
  look.add(state, 'showBg').name('environment')
  look.add(state, 'frame', frameChoices)

  // ellipsoids
  const ell = gui.addFolder('Ellipsoids')
  ell.add(state, 'showOmegaPlane').name('Show Omega Plane')
  ell.add(state, 'showEllipsoids').name('Show L space Ellipsoids')
  const setLspaceOpacity = () =>
    View.ellipsoids.setOpacity(state.ELopacity, state.LLopacity)
  ell
    .add(state, 'LLopacity', 0, 1, 0.1)
    .name('L²(L) opacity')
    .onChange(setLspaceOpacity)
  ell
    .add(state, 'ELopacity', 0, 1, 0.1)
    .name('E(L) opacity')
    .onChange(setLspaceOpacity)
  ell.add(state, 'showRollingEllipsoid').name('Show E(w) Ellipsoid')
  const setWspaceOpacity = () => {
    View.rollingEllipsoid.setOpacity(state.Ewopacity)
    View.rollingMomentumEllipsoid.setOpacity(state.Lwopacity)
  }
  ell
    .add(state, 'Ewopacity', 0, 1, 0.1)
    .name('E(w) opacity')
    .onChange(setWspaceOpacity)
  ell
    .add(state, 'showRollingMomentumEllipsoid')
    .name('Show L²(w) space Ellipsoid')
  ell
    .add(state, 'Lwopacity', 0, 1, 0.1)
    .name('L²(w) opacity')
    .onChange(setWspaceOpacity)
  ell.add(state, 'showKissingSpheres').name('Show Kissing Spheres')
  const setKissOpacity = () => {
    View.kissingSpheres.setOpacity(
      state.kissOuterOpacity,
      state.kissInnerOpacity
    )
  }
  ell
    .add(state, 'kissInnerOpacity', 0, 1, 0.1)
    .name('Inner opacity')
    .onChange(setKissOpacity)
  ell
    .add(state, 'kissOuterOpacity', 0, 1, 0.1)
    .name('Outer opacity')
    .onChange(setKissOpacity)

  const arrows = gui.addFolder('Arrows')
  arrows.add(state, 'showOmega').name('Show angular velocity')
  arrows.add(state, 'showJ').name('Show angular momentum')
  arrows.add(state, 'normalizedArrows').name('Normalize lengths')
  arrows.add(state, 'arrowScale').name('Scale factor')

  const trails = gui.addFolder('Trails')
  trails.add(state, 'showBodyTrails').name('body trails')
  trails.add(state, 'whichBodyTrails', { Both: 0, Mass1: 1, Mass2: 2 })
  trails.add(state, 'showPV').name('pseudovector trials')
  trails.add(state, 'whichPVTrails', { Both: 0, J: 1, omega: 2 })
  trails
    .add(state, 'trailsFrame', ['match', ...frameChoices])
    .name('trails frame')
  trails.add(state, 'trailLength', 1, 50, 0.1).name('trail length')

  pauseCtrl = gui.add(state, 'togglePause').name('Play')

  gui.onChange((e) => {
    if (e.property === 'L' || e.property === 'energy_scale') {
      setOmegaFromEnergy()
    }
    onChange(e)
  })
  onChange({ object: state })

  const metrics = rootGui.addFolder('Metrics').close()
  metrics.add(state, 'angularMomentum').disable().listen()

  return {
    rootGui,
    gui,
    state,
  }
}

//
function main() {
  let stop = false
  let pause = true

  init()

  let cameraTarget = View.scene
  let trailsTarget = View.scene
  let trailsFrame = View.layout
  let normalizedArrows = true
  let arrowScale = 1

  const system = createSystem()
  const pendulumView = createPendulumView(
    document.getElementById('pendulum-view')
  )
  const ellipsoidView = createEllipsoidView(
    document.getElementById('ellipsoid-view')
  )

  function animate() {
    if (stop) {
      return
    }
    render()
    stats.update()
    requestAnimationFrame(animate)
  }

  const trails = [View.x1Trail, View.x2Trail, View.jTrail, View.omegaTrail]

  const tmpV = new THREE.Vector3()
  const updateTrails = () => {
    View.x1Trail.update(system.x1, trailsTarget)
    View.x2Trail.update(system.x2, trailsTarget)
    View.jTrail.update(
      tmpV.copy(system.angularMomentum).normalize(),
      trailsTarget
    )

    tmpV.copy(system.omega)
    if (normalizedArrows) {
      tmpV.normalize()
    } else {
      tmpV.multiplyScalar(1 / system.angularMomentum.length())
    }
    tmpV.multiplyScalar(arrowScale)
    View.omegaTrail.update(tmpV, trailsTarget)
  }

  const clearTrails = () => {
    trails.forEach((t) => t.clear())
  }

  const FUDGE = new THREE.Vector3(1, 1, 1).normalize()
  const getPendulumAngle = (x1, x2, L) => {
    const alpha = tmpV.copy(L).lerp(FUDGE, 1e-6).cross(x2).angleTo(x1)
    const sign = alpha > Math.PI / 2 ? 1 : -1
    tmpV.copy(L).lerp(FUDGE, 1e-6).projectOnPlane(x1)
    return 2 * sign * tmpV.angleTo(x2) - Math.PI / 2
  }

  let showOmega = true
  let showJ = true
  let rotateJ
  let prevT = performance.now()
  let orientCamera = cameraOrientator(View.scene, View.cameraContainer)
  function render() {
    const time = performance.now()
    const dt = time - prevT
    prevT = time

    // View.camera.lookAt(View.layout)

    if (!pause) {
      system.step(dt)
    }
    View.spinner.setOrientation(system.qRot)

    const omegaScale =
      arrowScale / (!normalizedArrows ? system.angularMomentum.length() : 1)

    View.ellipsoids.setScale(arrowScale * ARROW_LENGTH)
    View.rollingEllipsoid.setScale(arrowScale * ARROW_LENGTH)
    View.kissingSpheres.setScale(arrowScale * ARROW_LENGTH)
    View.rollingMomentumEllipsoid.setScale(arrowScale * ARROW_LENGTH)
    View.omegaPlane.plane.normal.copy(system.angularMomentum).multiplyScalar(-1)
    View.omegaPlane.plane.normal.applyQuaternion(View.layoutQ)
    View.omegaPlane.plane.constant =
      (arrowScale * ARROW_LENGTH * system.omega.dot(system.angularMomentum)) /
      system.angularMomentum.lengthSq()

    setArrow(View.angMomArrow, system.angularMomentum, false, arrowScale)
    setArrow(View.omegaArrow, system.omega, !normalizedArrows, omegaScale)
    View.angMomArrow.visible = showJ && View.angMomArrow.visible
    View.omegaArrow.visible = showOmega && View.omegaArrow.visible
    setArrow(View.x1Arrow, system.x1)
    setArrow(View.x2Arrow, system.x2)

    View.Jframe.quaternion.copy(rotateJ ? system.jRot : system.jWorld)
    View.omegaFrame.quaternion.copy(system.omegaRot)

    orientCamera(time)
    if (!pause) {
      updateTrails()
    }
    controls.update()
    // View.camera.lookAt(View.scene.position)
    // renderer.render(View.scene, View.camera)
    View.composer.render()

    pendulumView.update({
      angle: getPendulumAngle(system.x1, system.x2, system.angularMomentum),
    })
    // const [m1, m2] = system.getMasses()
    // ellipsoidView.update(system.omega, system.angularMomentum.length(), m1, m2)
    ellipsoidView.render()
  }

  window.addEventListener('resize', onWindowResize)

  const triggersRefresh = [
    'r',
    'q',
    'psi',
    'chi',
    'w_x',
    'w_y',
    'w_z',
    'energy_scale',
    'L',
  ]

  const restart = (state) => {
    system.setMassRatio(state.r, state.q)
    system.setInitialPosition(state.psi, state.chi)
    system.setOmega(state.omega)
    View.spinner.setMasses(...system.getMasses())
    system.zeroTime()
    ellipsoidView.update(system)
    View.ellipsoids.update(system)
    View.rollingEllipsoid.update(system)
    View.rollingMomentumEllipsoid.update(system)
    View.kissingSpheres.update(system)
  }

  const update = (e) => {
    const state = e.object
    if (!e.property || triggersRefresh.indexOf(e.property) > -1) {
      restart(state)
      clearTrails()
    }
    if (e.property === 'paused') {
      pause = e.value
      return
    }
    normalizedArrows = state.normalizedArrows
    arrowScale = state.arrowScale
    showOmega = state.showOmega
    showJ = state.showJ
    View.axesHelper.visible = state.showAxes
    View.ground.visible = View.sky.visible = state.showBg

    trails.forEach((t) => t.setOptions({ maxDistance: state.trailLength }))

    const prevTrails = trailsFrame
    match(state.trailsFrame === 'match' ? state.frame : state.trailsFrame, {
      world: () => {
        trailsTarget = View.scene
        trailsFrame = View.layout
      },
      'J up': () => {
        trailsTarget = View.scene
        trailsFrame = View.layout
      },
      J: () => {
        trailsTarget = View.Jframe
        trailsFrame = trailsTarget
      },
      omega_0: () => {
        trailsTarget = View.omegaFrame
        trailsFrame = trailsTarget
      },
      body: () => {
        trailsTarget = View.spinner.group
        trailsFrame = trailsTarget
      },
    })

    if (prevTrails !== trailsFrame) {
      clearTrails()
      trailsFrame.add(View.trailsGroup)
    }

    const prevFrame = cameraTarget
    cameraTarget = match(state.frame, {
      world: () => View.scene,
      'J up': () => View.Jframe,
      J: () => View.Jframe,
      omega_0: () => View.omegaFrame,
      body: () => View.spinner.group,
    })

    rotateJ = state.frame !== 'J up'

    if (prevFrame !== cameraTarget) {
      orientCamera = cameraOrientator(cameraTarget, View.cameraContainer)
    }
    View.x1Arrow.line.visible = View.x1Arrow.cone.visible = View.x2Arrow.line.visible = View.x2Arrow.cone.visible =
      state.showXVecs
    View.x1Trail.mesh.visible =
      state.showBodyTrails && state.whichBodyTrails !== 2
    View.x2Trail.mesh.visible =
      state.showBodyTrails && state.whichBodyTrails !== 1
    View.jTrail.mesh.visible = state.showPV && state.whichPVTrails !== 2
    View.omegaTrail.mesh.visible = state.showPV && state.whichPVTrails !== 1

    View.ellipsoids.group.visible = state.showEllipsoids
    View.rollingEllipsoid.group.visible = state.showRollingEllipsoid
    View.omegaPlane.visible = state.showOmegaPlane
    View.rollingMomentumEllipsoid.group.visible =
      state.showRollingMomentumEllipsoid
    View.kissingSpheres.group.visible = state.showKissingSpheres
    state.angularMomentum = system.angularMomentum.length()
  }

  const { rootGui } = makeGui(update)
  gc(Object.values(View))
  gc(rootGui)
  animate()
  gc(pendulumView)
  gc(ellipsoidView)
  gc({
    cleanup: () => {
      stop = true
      window.removeEventListener('resize', onWindowResize)
      renderer.dispose()
      controls.dispose()
    },
  })
}

main()
