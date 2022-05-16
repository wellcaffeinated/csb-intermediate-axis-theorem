import './styles.css'

import * as THREE from 'three'
import { Easing, Util } from 'intween'
import GUI from 'lil-gui'
import store from 'store'

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
import { Vector2, Vector3 } from 'three'
import { Trail } from './trails'

import { $GC, $, $$ } from './slick-csb'

const gc = $GC(module)

let container, stats, controls

let renderer
const View = {}

const HSL = (h, s, l) => {
  return new THREE.Color().setHSL(h, s, l)
}

const white = new THREE.Color(0xfffdfc)
const red = new THREE.Color(0xcd4832) //HSL(1, 0.5, 0.5)
const blue = new THREE.Color(0x0e867f) //HSL(0.5, 0.5, 0.5)
const grey = new THREE.Color(0x5f5e55) //HSL(0.5, 0.1, 0.5)
const pink = new THREE.Color(0xe40873)
const yellow = new THREE.Color(0xfdde3b)
const gold = new THREE.Color(0xbca961)
const clay = new THREE.Color(0x615c45)
const brown = new THREE.Color(0x9d6b49)
const orange = new THREE.Color(0xe16f00)
const mustard = new THREE.Color(0xfdce3b)

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

  const massX1 = createMass({ x: 0, y: 0, z: 100 }, props, red)
  const massX2 = createMass({ x: 0, y: 0, z: -100 }, props, red)
  const massY1 = createMass({ x: 0, y: 100, z: 0 }, props, blue)
  const massY2 = createMass({ x: 0, y: -100, z: 0 }, props, blue)

  const masses = [massX1, massX2, massY1, massY2]

  group.add(...masses.map((m) => m.mesh))

  const geometry = new THREE.BoxGeometry(200, 200, 4)
  const material = new THREE.MeshStandardMaterial({
    // bumpScale: 1,
    color: white,
    metalness: 0.5,
    roughness: 0.9,
    envMap: null,
  })
  const plate = new THREE.Mesh(geometry, material)
  plate.castShadow = true
  plate.receiveShadow = true
  plate.rotation.set(0, Math.PI / 2, 0)
  group.add(plate)

  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 200, 32)
  const rod = new THREE.Mesh(cyl, material)
  rod.castShadow = true
  rod.receiveShadow = true
  rod.rotation.set(0, 0, 0)
  group.add(rod)

  // const axesHelper = new THREE.AxesHelper(500)
  // group.add(axesHelper)

  const setRotation = (x = 0, y = 0, z = 0) => {
    group.rotation.set(x, y, z)
  }

  const setOrientation = (quaternion) => {
    group.rotation.setFromQuaternion(quaternion)
  }

  const setMasses = (m1, m2) => {
    const sx = massSizeScale(m1)
    massX1.mesh.scale.set(sx, sx, sx)
    massX2.mesh.scale.set(sx, sx, sx)

    const sy = massSizeScale(m2)
    massY1.mesh.scale.set(sy, sy, sy)
    massY2.mesh.scale.set(sy, sy, sy)
    plate.scale.set(1, m2 / m1, 1)
    rod.visible = !!m2
  }

  setMasses(1, 1)

  // scene.background = texture
  return {
    group,
    setRotation,
    setMasses,
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
  View.scene.add(View.layout)

  View.Jframe = new THREE.Object3D()
  View.layout.add(View.Jframe)

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

  // spinner

  View.spinner = createSpinner()
  View.layout.add(View.spinner.group)

  // arrows
  View.angMomArrow = new THREE.ArrowHelper(
    new THREE.Vector3(),
    View.layout.position,
    180,
    pink
  )
  View.layout.add(View.angMomArrow)
  View.omegaArrow = new THREE.ArrowHelper(
    new THREE.Vector3(),
    View.layout.position,
    180,
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
  light.shadow.mapSize.width = 512 * 4
  light.shadow.mapSize.height = 512 * 4
  light.shadow.radius = 3
  // light.shadow.samples = 2
  light.shadow.bias = -0.0005

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
  ssaoPass.kernelRadius = 8
  ssaoPass.minDistance = 0.001
  ssaoPass.maxDistance = 0.025
  // ssaoPass.ssaoMaterial.uniforms[ 'cameraNear' ].value = 0.01
  ssaoPass.ssaoMaterial.uniforms['cameraFar'].value = 6000
  View.composer.addPass(ssaoPass)

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
const setArrow = (view, v) => {
  n.copy(v)
  if (n.lengthSq() !== 0) {
    view.setDirection(n.normalize())
    view.visible = true
  } else {
    view.visible = false
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
  const frameChoices = ['world', 'J', 'body']
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

  const state = {
    r: 0.5,
    psi: 90,
    chi: 90,
    w_x: 1e-6,
    w_y: 0,
    w_z: 0.005,
    get omega() {
      return new Vector3(state.w_x, state.w_y, state.w_z)
    },
    frame: frameChoices[0],
    showXVecs: false,
    showAxes: true,
    showBg: true,
    showPV: true,
    trailsFrame: 'match',
    showBodyTrails: true,
    trailLength: 10,
    paused: true,
    togglePause: () => {
      state.paused = !state.paused
      pauseCtrl.name(state.paused ? 'Play' : 'Pause')
      onChange({ object: state, property: 'paused', value: state.paused })
    },
  }

  const cameraFolder = gui.addFolder('Camera').close()
  cameraFolder.add(View.camera.position, 'x')
  cameraFolder.add(View.camera.position, 'y')
  cameraFolder.add(View.camera.position, 'z')

  gui.add(state, 'r', 0, 1, 0.01).name('mass ratio')
  gui.add(state, 'psi', 0, 180, 1)
  gui.add(state, 'chi', 0, 180, 1)
  const omega = gui.addFolder('Angular Velocity')
  omega.add(state, 'w_x', -0.02, 0.02, 1e-6)
  omega.add(state, 'w_y', -0.02, 0.02, 1e-6)
  omega.add(state, 'w_z', -0.02, 0.02, 1e-6)

  const trails = gui.addFolder('Trails')
  trails.add(state, 'showBodyTrails').name('body trails')
  trails.add(state, 'showPV').name('pseudovector trials')
  trails
    .add(state, 'trailsFrame', ['match', ...frameChoices])
    .name('trails frame')
  trails.add(state, 'trailLength', 1, 20, 0.1).name('trail length')

  gui.add(state, 'showAxes').name('axes')
  gui.add(state, 'showBg').name('environment')
  gui.add(state, 'frame', frameChoices)

  pauseCtrl = gui.add(state, 'togglePause').name('Play')

  gui.onChange(onChange)
  onChange({ object: state })

  return rootGui
}

//
function main() {
  let stop = false
  let pause = true

  init()

  let cameraTarget = View.scene
  let trailsTarget = View.scene
  let trailsFrame = View.layout
  const system = createSystem()

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
    View.omegaTrail.update(tmpV.copy(system.omega).normalize(), trailsTarget)
  }

  const clearTrails = () => {
    trails.forEach((t) => t.clear())
  }

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

    setArrow(View.angMomArrow, system.angularMomentum)
    setArrow(View.omegaArrow, system.omega)
    setArrow(View.x1Arrow, system.x1)
    setArrow(View.x2Arrow, system.x2)

    View.Jframe.quaternion.copy(system.jRot)

    orientCamera(time)
    if (!pause) {
      updateTrails()
    }
    controls.update()
    // View.camera.lookAt(View.scene.position)
    // renderer.render(View.scene, View.camera)
    View.composer.render()
  }

  window.addEventListener('resize', onWindowResize)

  const triggersRefresh = ['r', 'psi', 'chi', 'w_x', 'w_y', 'w_z']

  const restart = (state) => {
    system.setMassRatio(state.r)
    system.setInitialPosition(state.psi, state.chi)
    system.setOmega(state.omega)
    View.spinner.setMasses(...system.getMasses())
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
    View.axesHelper.visible = state.showAxes
    View.ground.visible = View.sky.visible = state.showBg

    trails.forEach((t) => t.setOptions({ maxDistance: state.trailLength }))

    const prevTrails = trailsFrame
    match(state.trailsFrame === 'match' ? state.frame : state.trailsFrame, {
      world: () => {
        trailsTarget = View.scene
        trailsFrame = View.layout
      },
      J: () => {
        trailsTarget = View.Jframe
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
      J: () => View.Jframe,
      body: () => View.spinner.group,
    })

    if (prevFrame !== cameraTarget) {
      orientCamera = cameraOrientator(cameraTarget, View.cameraContainer)
    }
    View.x1Arrow.line.visible = View.x1Arrow.cone.visible = View.x2Arrow.line.visible = View.x2Arrow.cone.visible =
      state.showXVecs
    View.x1Trail.mesh.visible = View.x2Trail.mesh.visible = state.showBodyTrails
    View.jTrail.mesh.visible = View.omegaTrail.mesh.visible = state.showPV
  }

  const gui = makeGui(update)
  gc(gui)
  animate()

  gc({
    cleanup: () => {
      stop = true
      window.removeEventListener('resize', onWindowResize)
      renderer.dispose()
      controls.dispose()
      View.composer.dispose()
      View.scene.dispose()
    },
  })
}

main()
