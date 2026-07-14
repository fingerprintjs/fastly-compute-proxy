import {
  IntegrationEnv,
  isScriptDownloadPathSet,
  isGetResultPathSet,
  isProxySecretSet,
  agentScriptDownloadPathVarName,
  getResultPathVarName,
  proxySecretVarName,
} from '../env'
import packageJson from '../../package.json'
import { env } from 'fastly:env'
import { Backend } from 'fastly:backend'

function generateNonce() {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const indices = crypto.getRandomValues(new Uint8Array(24))
  for (const index of indices) {
    result += characters[index % characters.length]
  }
  return btoa(result)
}

function buildHeaders(styleNonce: string): Headers {
  const headers = new Headers()
  headers.append('Content-Type', 'text/html')
  headers.append(
    'Content-Security-Policy',
    `default-src 'none'; img-src https://fingerprint.com; style-src 'nonce-${styleNonce}'`
  )
  return headers
}

function createVersionElement(): string {
  const fastlyServiceVersion = env('FASTLY_SERVICE_VERSION')
  let result = ''
  result += '<ul>'
  result += `
    <li>
    ℹ️ Integration version: <strong>${packageJson.version}</strong>
    </li>
    <li>
    ℹ️ Fastly Compute Service version: <strong>${fastlyServiceVersion}</strong>
    </li>
  `

  result += getBackendsInformation()
  result += '</ul>'

  return result
}

export function getBackendsInformation(): string {
  let information = ''

  if (Backend.exists('fingerprint')) {
    information += '<li>ℹ️ Fingerprint backend is configured ✅</li>'
    return information
  }

  // backward compat: region-named backends
  const usResultBackend = Backend.exists('api.fpjs.io')
  const euResultBackend = Backend.exists('eu.api.fpjs.io')
  const apResultBackend = Backend.exists('ap.api.fpjs.io')
  const supportedRegions = []
  if (usResultBackend) {
    supportedRegions.push('US')
  }
  if (euResultBackend) {
    supportedRegions.push('EU')
  }
  if (apResultBackend) {
    supportedRegions.push('AP')
  }
  if (supportedRegions.length === 0) {
    information +=
      '<li>⚠️ Your integration is missing the "fingerprint" backend. Please add a backend named "fingerprint" pointing to your regional Fingerprint API host.</li>'
  } else {
    information += `<li>⚠️ Deprecated: region-named backends are configured for <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>${supportedRegions.join(', ')}</strong>. Please migrate to a single backend named "fingerprint".</li>`
  }

  return information
}

function createContactInformationElement(): string {
  return `
  <p>
  ❓Please <a href="https://fingerprint.com/support">reach out to our support team</a> if you have any issues.
  </p>
  `
}

function buildConfigurationItem(
  label: string,
  options: {
    isSet: boolean
    required: boolean
    message?: string
  }
): string {
  const { isSet, required, message } = options

  let statusText: string
  if (isSet) {
    statusText = 'set ✅'
  } else if (required) {
    statusText = 'missing ❌'
  } else {
    statusText = 'not set ⚠️'
  }

  let extraMessage = ''
  if (!isSet && message) {
    extraMessage = ` ${message}`
  }

  return `<li><code>${label}</code> (${required ? 'Required' : 'Optional'}) is ${statusText}.${extraMessage}</li>`
}

function createEnvVarsInformationElement(env: IntegrationEnv): string {
  let result = ''

  result += '<p>🛠️ Required configuration values:</p>'
  result += '<ul>'
  result += buildConfigurationItem(proxySecretVarName, {
    isSet: isProxySecretSet(env),
    required: true,
    message: 'Your integration is not working correctly.',
  })
  result += '</ul>'

  result += '<p>🛠️ V3 API configuration values:</p>'
  if (!isScriptDownloadPathSet(env) || !isGetResultPathSet(env)) {
    result += '<p>⚠️ If you are not using the V3 API, these warnings can be safely ignored.</p>'
  }
  result += '<ul>'
  result += buildConfigurationItem(agentScriptDownloadPathVarName, {
    isSet: isScriptDownloadPathSet(env),
    required: false,
  })
  result += buildConfigurationItem(getResultPathVarName, {
    isSet: isGetResultPathSet(env),
    required: false,
  })
  result += '</ul>'

  return result
}

function buildBody(env: IntegrationEnv, styleNonce: string): string {
  let body = `
  <html lang='en-US'>
  <head>
    <meta charset='utf-8'/>
    <title>Fingerprint Pro Fastly Compute Integration</title>
    <link rel='icon' type='image/x-icon' href='https://fingerprint.com/img/favicon.ico'>
    <style nonce='${styleNonce}'>
      body {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      div {
        width: 60%;
        max-width: 800px;
      }
      h1 {
        display: block;
        padding-top: 1em;
        padding-bottom: 1em;
      }
      p {
        padding-top: 1em;
      }
      code {
        background:rgba(135,131,120,.15);
        color:#EB5757;
        border-radius:4px;
        font-size:85%;
        padding:0.2em 0.4em
      }
    </style>
  </head>
  <body>
  <div>
    <h1>Fingerprint Pro Fastly Compute Integration</h1>
  `

  body += `<p>🎉 Your Fastly Integration is deployed!</p>`

  body += createVersionElement()
  body += createEnvVarsInformationElement(env)
  body += createContactInformationElement()

  body += `
  </div>
  </body>
  </html>
  `
  return body
}

export function handleStatusPage(request: Request, env: IntegrationEnv): Response {
  if (request.method !== 'GET') {
    return new Response(null, { status: 405 })
  }

  const styleNonce = generateNonce()
  const headers = buildHeaders(styleNonce)
  const body = buildBody(env, styleNonce)

  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers,
  })
}
