#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const config = {
  namespace: process.env.K8S_NAMESPACE || 'cab-booking',
  requireIstioctl: String(process.env.REQUIRE_ISTIOCTL || 'false').toLowerCase() === 'true',
  outputPath: process.env.MESH_EVIDENCE_OUTPUT
    || path.join(process.cwd(), 'docs', 'evidence', 'mesh-runtime-verification.json')
}

function run(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function safeRun(command) {
  try {
    return { ok: true, output: run(command) }
  } catch (error) {
    return {
      ok: false,
      output: String(error.stdout || error.stderr || error.message || error)
    }
  }
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function validatePodsHaveIstioProxy(podsJson) {
  const items = Array.isArray(podsJson?.items) ? podsJson.items : []
  const appPods = items.filter((item) => {
    const name = String(item?.metadata?.name || '')
    return !name.includes('mongodb')
      && !name.includes('postgres')
      && !name.includes('redis')
      && !name.includes('rabbitmq')
      && !name.includes('prometheus')
      && !name.includes('grafana')
  })

  const missing = []
  for (const pod of appPods) {
    const podName = String(pod?.metadata?.name || 'unknown-pod')
    const containers = Array.isArray(pod?.spec?.containers) ? pod.spec.containers : []
    const hasIstio = containers.some((container) => String(container?.name || '').toLowerCase() === 'istio-proxy')
    if (!hasIstio) {
      missing.push(podName)
    }
  }

  return {
    totalChecked: appPods.length,
    missing
  }
}

function main() {
  const evidence = {
    generatedAt: new Date().toISOString(),
    namespace: config.namespace,
    checks: {},
    passed: false
  }

  const kubectlVersion = safeRun('kubectl version --client=true')
  ensure(kubectlVersion.ok, 'kubectl is not available')
  evidence.checks.kubectl = { ok: kubectlVersion.ok, output: kubectlVersion.output }

  const clusterInfo = safeRun('kubectl cluster-info')
  ensure(clusterInfo.ok, 'kubectl cannot reach cluster')
  evidence.checks.clusterInfo = { ok: clusterInfo.ok, output: clusterInfo.output }

  const currentContext = safeRun('kubectl config current-context')
  ensure(currentContext.ok, 'kubectl current-context unavailable')
  evidence.checks.currentContext = { ok: true, output: currentContext.output }

  const ns = safeRun(`kubectl get namespace ${config.namespace} -o name`)
  ensure(ns.ok, `namespace not found: ${config.namespace}`)
  evidence.checks.namespace = { ok: true, output: ns.output }

  const peerAuth = safeRun(`kubectl get peerauthentication cab-booking-strict-mtls -n ${config.namespace} -o json`)
  ensure(peerAuth.ok, 'PeerAuthentication cab-booking-strict-mtls not found')
  const peerAuthObj = parseJson(peerAuth.output, {})
  const mtlsMode = String(peerAuthObj?.spec?.mtls?.mode || '').toUpperCase()
  ensure(mtlsMode === 'STRICT', `PeerAuthentication mtls.mode is not STRICT (found: ${mtlsMode || 'empty'})`)
  evidence.checks.peerAuthentication = { ok: true, mtlsMode }

  const authz = safeRun(`kubectl get authorizationpolicy -n ${config.namespace} -o json`)
  ensure(authz.ok, 'AuthorizationPolicy list failed')
  const authzObj = parseJson(authz.output, { items: [] })
  ensure((authzObj.items || []).length > 0, 'No AuthorizationPolicy resources found')
  evidence.checks.authorizationPolicy = { ok: true, count: (authzObj.items || []).length }

  const netpol = safeRun(`kubectl get networkpolicy default-deny-all -n ${config.namespace} -o json`)
  ensure(netpol.ok, 'NetworkPolicy default-deny-all not found')
  const netpolObj = parseJson(netpol.output, {})
  const policyTypes = Array.isArray(netpolObj?.spec?.policyTypes) ? netpolObj.spec.policyTypes : []
  ensure(policyTypes.includes('Ingress') && policyTypes.includes('Egress'), 'default-deny-all must include both Ingress and Egress policyTypes')
  evidence.checks.defaultDenyNetworkPolicy = { ok: true, policyTypes }

  const pods = safeRun(`kubectl get pods -n ${config.namespace} -o json`)
  ensure(pods.ok, 'Cannot list pods in namespace')
  const podsObj = parseJson(pods.output, { items: [] })
  const sidecarCheck = validatePodsHaveIstioProxy(podsObj)
  ensure(sidecarCheck.totalChecked > 0, 'No application pods found to verify sidecar injection')
  ensure(sidecarCheck.missing.length === 0, `Pods missing istio-proxy sidecar: ${sidecarCheck.missing.join(', ')}`)
  evidence.checks.istioSidecarInjection = { ok: true, ...sidecarCheck }

  const istioctl = safeRun('istioctl proxy-status')
  if (config.requireIstioctl) {
    ensure(istioctl.ok, 'istioctl proxy-status failed while REQUIRE_ISTIOCTL=true')
  }
  evidence.checks.istioctlProxyStatus = {
    ok: istioctl.ok,
    required: config.requireIstioctl,
    output: istioctl.output
  }

  evidence.passed = true

  fs.mkdirSync(path.dirname(config.outputPath), { recursive: true })
  fs.writeFileSync(config.outputPath, JSON.stringify(evidence, null, 2) + '\n', 'utf8')

  console.log('Mesh runtime verification passed')
  console.log(`Evidence file: ${path.relative(process.cwd(), config.outputPath)}`)
}

try {
  main()
} catch (error) {
  const failure = {
    generatedAt: new Date().toISOString(),
    namespace: config.namespace,
    passed: false,
    error: error.message
  }

  fs.mkdirSync(path.dirname(config.outputPath), { recursive: true })
  fs.writeFileSync(config.outputPath, JSON.stringify(failure, null, 2) + '\n', 'utf8')

  console.error('Mesh runtime verification failed:', error.message)
  console.error(`Evidence file: ${path.relative(process.cwd(), config.outputPath)}`)
  process.exit(1)
}
