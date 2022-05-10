import * as THREE from 'three'
import _throttle from 'lodash/throttle'
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three.meshline'

export const Trail = ({
  renderer,
  maxSize = 100,
  maxDistance = 1000,
  throttleTime = 10,
  throttleDistance = 1,
  color = 0xdddddd,
  usePoints = false,
} = {}) => {
  const group = new THREE.Group()
  const resolution = new THREE.Vector2(
    renderer ? renderer.width : window.innerWidth,
    renderer ? renderer.height : window.innerHeight
  )
  const points = []
  const distances = []
  let distance = 0
  const pointsGeo = new THREE.BufferGeometry()
  const line = new MeshLine()
  const trail = usePoints
    ? new THREE.Points(pointsGeo, new THREE.PointsMaterial({ color, size: 4 }))
    : new THREE.Mesh(
        line,
        new MeshLineMaterial({
          color,
          lineWidth: 4,
          resolution,
          sizeAttenuation: 0,
        })
      )
  const q = new THREE.Quaternion()
  const vtmp = new THREE.Vector3()

  const setOptions = (o) => {
    maxSize = o.maxSize || maxSize
    maxDistance = o.maxDistance || maxDistance
    throttleDistance = o.throttleDistance || throttleDistance
  }

  const clear = () => {
    points.splice(0, points.length)
    distances.splice(0, distances.length)
    distance = 0
    pointsGeo.setFromPoints(points)
    line.setPoints(points)
    pointsGeo.attributes.position.needsUpdate = true
  }

  const update = (v, referenceFrame) => {
    const last = points[points.length - 1]
    vtmp.copy(v)
    if (referenceFrame) {
      q.copy(referenceFrame.quaternion)
      q.invert()
      vtmp.applyQuaternion(q)
    }
    const d = last ? vtmp.distanceTo(last) : 0
    if (last && d < throttleDistance) {
      return
    }
    let vc
    while (points.length >= maxSize || distance >= maxDistance) {
      vc = points.shift()
      distance -= distances.shift()
    }
    const point = vc ? vc.copy(vtmp) : vtmp.clone()
    distance += d
    distances.push(d)
    points.push(point)
    pointsGeo.setFromPoints(points)
    line.setPoints(points)
    pointsGeo.attributes.position.needsUpdate = true
  }

  group.add(trail)

  return {
    mesh: group,
    trail,
    update,
    clear,
    setOptions,
  }
}
