import * as THREE from 'three'

const defaultOptions = {
  stepSize: 8,
  maxSteps: 20,
}

export const createSystem = (options) => {
  options = Object.assign({}, defaultOptions, options)
  // const R = 10
  // const Rsq = R * R
  const totalMass = 4
  let massRatio = 1
  let m1 = 2
  let m2 = 2
  const X1AXIS = new THREE.Vector3(0, 0, 1)
  const X2AXIS = new THREE.Vector3(0, 1, 0)
  const UP = new THREE.Vector3(0, 1, 0)
  // x1 and x2 will be unit vectors
  const x1 = new THREE.Vector3().copy(X1AXIS)
  const x2 = new THREE.Vector3().copy(X2AXIS)
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const qRot = new THREE.Quaternion()
  const jRot = new THREE.Quaternion()
  const jWorld = new THREE.Quaternion()
  let omega_0 = 0

  // acceleration of first object
  const accTmpV = new THREE.Vector3()
  const acc = (x1, v1, m2, x2, v2, into) => {
    const v1sqr = v1.lengthSq()
    const v1v2 = v1.dot(v2)
    // (-x1 * v1sqr - 2 * m2 * x2 * v1v2 / totalMass) / Rsq
    into.copy(x1).multiplyScalar(-v1sqr)
    accTmpV.copy(x2).multiplyScalar((-2 * m2 * v1v2) / totalMass)
    return into.add(accTmpV) //.multiplyScalar(1 / Rsq)
  }

  const tmpV = new THREE.Vector3()
  const angularMomentum = new THREE.Vector3()
  const updateAngMom = () => {
    angularMomentum.crossVectors(x1, v1).multiplyScalar(m1)
    tmpV.crossVectors(x2, v2).multiplyScalar(m2)
    angularMomentum.add(tmpV)
    jRot.setFromUnitVectors(UP, tmpV.copy(angularMomentum).normalize())
    jWorld.copy(jRot)
  }

  const omega = new THREE.Vector3()
  const tmpV2 = new THREE.Vector3()
  const updateOmega = () => {
    // zhat = cross(x1vec,x2vec)/R**2
    // dzhat = (cross(x1vec,v2vec) + cross(v1vec,x2vec))/R**2
    // omega = 0.5*(cross(x1vec,v1vec)/R**2 + cross(x2vec,v2vec)/R**2 + cross(zhat,dzhat))
    omega.crossVectors(x1, v1).add(tmpV.crossVectors(x2, v2))
    tmpV.crossVectors(x1, v2).add(tmpV2.crossVectors(v1, x2))
    tmpV2.crossVectors(x1, x2).cross(tmpV)
    omega.add(tmpV2)
  }

  const setMassRatio = (r = 1) => {
    massRatio = r
    m2 = (r * totalMass) / (1 + r)
    m1 = totalMass / (1 + r)
    updateAngMom()
  }

  const setOmega = (omega) => {
    v1.crossVectors(omega, x1)
    v2.crossVectors(omega, x2)
    updateOmega()
    updateAngMom()
    omega_0 = angularMomentum.dot(omega) / angularMomentum.length()
  }

  const setInitialPosition = (psi, chi) => {
    psi *= Math.PI / 180
    chi *= Math.PI / 180
    // x1vec = vector(R*sin(psi),0,R*cos(psi))
    // x2vec = vector(-R*sin(chi)*cos(psi),R*cos(chi),R*sin(chi)*sin(psi))
    x1.set(Math.sin(psi), 0, Math.cos(psi))
    x2.set(
      -Math.sin(chi) * Math.cos(psi),
      Math.cos(chi),
      Math.sin(chi) * Math.sin(psi)
    )
    updateRot()
    updateOmega()
    updateAngMom()
  }

  const rtmp = new THREE.Vector3()
  const qtmp = new THREE.Quaternion()
  const updateRot = () => {
    qRot.setFromUnitVectors(X1AXIS, x1.normalize())
    rtmp.copy(X2AXIS).applyQuaternion(qRot)
    qtmp.setFromUnitVectors(rtmp, x2.normalize())
    qRot.multiplyQuaternions(qtmp, qRot)
  }

  const rk4Update = (() => {
    const x1tmp1 = new THREE.Vector3()
    const x2tmp1 = new THREE.Vector3()
    const x1tmp2 = new THREE.Vector3()
    const x2tmp2 = new THREE.Vector3()
    const x1tmp3 = new THREE.Vector3()
    const x2tmp3 = new THREE.Vector3()
    const x1tmp4 = new THREE.Vector3()
    const x2tmp4 = new THREE.Vector3()
    const v1tmp1 = new THREE.Vector3()
    const v2tmp1 = new THREE.Vector3()
    const v1tmp2 = new THREE.Vector3()
    const v2tmp2 = new THREE.Vector3()
    const v1tmp3 = new THREE.Vector3()
    const v2tmp3 = new THREE.Vector3()
    const v1tmp4 = new THREE.Vector3()
    const v2tmp4 = new THREE.Vector3()

    const update = (i, o, dt) => {
      o.x1.copy(i.v1).multiplyScalar(dt).add(x1)
      acc(i.x1, i.v1, m2, i.x2, i.v2, o.v1).multiplyScalar(dt).add(v1)
      o.x2.copy(i.v2).multiplyScalar(dt).add(x2)
      acc(i.x2, i.v2, m1, i.x1, i.v1, o.v2).multiplyScalar(dt).add(v2)
    }

    return function rk4(dt) {
      const dth = dt / 2

      // x1vec1 = x1vec + v1vec*dth
      // v1vec1 = v1vec + acc1(x1vec,v1vec,x2vec,v2vec)*dth
      // x2vec1 = x2vec + v2vec*dth
      // v2vec1 = v2vec + acc2(x1vec,v1vec,x2vec,v2vec)*dth
      update(
        { x1: x1, v1: v1, x2: x2, v2: v2 },
        { x1: x1tmp1, v1: v1tmp1, x2: x2tmp1, v2: v2tmp1 },
        dth
      )

      // x1vec2 = x1vec + v1vec1*dth
      // v1vec2 = v1vec + acc1(x1vec1,v1vec1,x2vec1,v2vec1)*dth
      // x2vec2 = x2vec + v2vec1*dth
      // v2vec2 = v2vec + acc2(x1vec1,v1vec1,x2vec1,v2vec1)*dth
      update(
        { x1: x1tmp1, v1: v1tmp1, x2: x2tmp1, v2: v2tmp1 },
        { x1: x1tmp2, v1: v1tmp2, x2: x2tmp2, v2: v2tmp2 },
        dth
      )

      // x1vec3 = x1vec + v1vec2*dt
      // v1vec3 = v1vec + acc1(x1vec2,v1vec2,x2vec2,v2vec2)*dt
      // x2vec3 = x2vec + v2vec2*dt
      // v2vec3 = v2vec + acc2(x1vec2,v1vec2,x2vec2,v2vec2)*dt
      update(
        { x1: x1tmp2, v1: v1tmp2, x2: x2tmp2, v2: v2tmp2 },
        { x1: x1tmp3, v1: v1tmp3, x2: x2tmp3, v2: v2tmp3 },
        dt
      )

      // x1vec4 = x1vec + v1vec3*dt
      // v1vec4 = v1vec + acc1(x1vec3,v1vec3,x2vec3,v2vec3)*dt
      // x2vec4 = x2vec + v2vec3*dt
      // v2vec4 = v2vec + acc2(x1vec3,v1vec3,x2vec3,v2vec3)*dt
      update(
        { x1: x1tmp3, v1: v1tmp3, x2: x2tmp3, v2: v2tmp3 },
        { x1: x1tmp4, v1: v1tmp4, x2: x2tmp4, v2: v2tmp4 },
        dt
      )

      // x1vec = (x1vec1 + 2*x1vec2 + x1vec3 + 0.5*x1vec4)/3.0 - 0.5*x1vec
      // v1vec = (v1vec1 + 2*v1vec2 + v1vec3 + 0.5*v1vec4)/3.0 - 0.5*v1vec
      // x2vec = (x2vec1 + 2*x2vec2 + x2vec3 + 0.5*x2vec4)/3.0 - 0.5*x2vec
      // v2vec = (v2vec1 + 2*v2vec2 + v2vec3 + 0.5*v2vec4)/3.0 - 0.5*v2vec
      x1tmp2.multiplyScalar(2)
      v1tmp2.multiplyScalar(2)
      x2tmp2.multiplyScalar(2)
      v2tmp2.multiplyScalar(2)
      x1tmp4
        .multiplyScalar(0.5)
        .add(x1tmp3)
        .add(x1tmp2)
        .add(x1tmp1)
        .multiplyScalar(1 / 3)
      v1tmp4
        .multiplyScalar(0.5)
        .add(v1tmp3)
        .add(v1tmp2)
        .add(v1tmp1)
        .multiplyScalar(1 / 3)
      x2tmp4
        .multiplyScalar(0.5)
        .add(x2tmp3)
        .add(x2tmp2)
        .add(x2tmp1)
        .multiplyScalar(1 / 3)
      v2tmp4
        .multiplyScalar(0.5)
        .add(v2tmp3)
        .add(v2tmp2)
        .add(v2tmp1)
        .multiplyScalar(1 / 3)

      x1.multiplyScalar(-0.5).add(x1tmp4)
      v1.multiplyScalar(-0.5).add(v1tmp4)
      x2.multiplyScalar(-0.5).add(x2tmp4)
      v2.multiplyScalar(-0.5).add(v2tmp4)
    }
  })()

  let time = 0
  const step = (dt) => {
    let stepSize = options.stepSize
    if (!dt) {
      dt = stepSize
    }

    let maxTime = options.maxSteps * stepSize
    let now = time
    let target = time + dt

    if (dt > maxTime) {
      now = target - maxTime
    }

    for (; now < target - stepSize; now += stepSize) {
      time = now
      rk4Update(stepSize)
    }

    // remainder
    if (now !== target) {
      time = target
      rk4Update(target - now)
    }

    updateRot()
    updateOmega()
    updateAngMom()
    qtmp.setFromAxisAngle(
      tmpV.copy(angularMomentum).normalize(),
      omega_0 * time
    )
    jRot.premultiply(qtmp)
  }

  const getMasses = () => {
    return [m1, m2]
  }

  return {
    setOmega,
    setInitialPosition,
    step,
    setMassRatio,
    qRot,
    getMasses,
    angularMomentum,
    omega,
    jRot,
    jWorld,
    x1,
    x2,
  }
}
