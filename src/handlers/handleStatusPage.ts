import {
  IntegrationEnv,
  isScriptDownloadPathSet,
  isGetResultPathSet,
  isProxySecretSet,
  agentScriptDownloadPathVarName,
  getResultPathVarName,
  proxySecretVarName,
  isOpenClientResponseSet,
  openClientResponseVarName,
  decryptionKeyVarName,
  isOpenClientResponseEnabled,
  isDecryptionKeySet,
  saveToKvStorePluginEnabledVarName,
  isSaveToKvStorePluginEnabled,
  isSaveToKvStorePluginEnabledSet,
  getDecryptionKey,
  checkKVStoreAvailability,
} from '../env'
import packageJson from '../../package.json'
import { env } from 'fastly:env'
import { getNamesForStores } from '../utils/getStore'
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
      '<li>⚠️ Your integration is missing backend hosts for <a href="https://dev.fingerprint.com/docs/regions">region support</a>. Please add at least one of the backends "api.fpjs.io", "eu.api.fpjs.io", or "ap.api.fpjs.io"</li>'
  } else {
    information += `<li>ℹ️ Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>${supportedRegions.join(', ')}</strong></li>`
  }

  return information
}

function isValidBase64(str: string | null | undefined): boolean {
  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

  if (!str) {
    return false
  }

  if (str.length % 4 !== 0) {
    return false
  }

  return base64Pattern.test(str)
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
    value?: string | null
    showValue?: boolean
  },
  env: IntegrationEnv
): string {
  const { isSet, required, value, showValue, message } = options

  let statusText: string
  if (isSet) {
    const valueText = showValue === true ? `<code>${value}</code>` : 'set'
    statusText = `${valueText} ✅`
  } else if (required) {
    statusText = 'missing ❌'
  } else {
    statusText = 'not set ⚠️'
  }

  let extraMessage = ''
  if (!isSet && message) {
    extraMessage = ` ${message}`
  }
  if (isSet && label === decryptionKeyVarName && !isValidBase64(getDecryptionKey(env))) {
    extraMessage = ` Invalid value provided ⚠️. Please copy and paste the correct value from the dashboard.`
  }

  return `<li><code>${label}</code> (${required ? 'Required' : 'Optional'}) is ${statusText}.${extraMessage}</li>`
}

async function buildKVStoreCheckMessage(): Promise<string> {
  const isKVStoreAvailable = await checkKVStoreAvailability()
  if (isKVStoreAvailable) {
    return ''
  }

  const { kvStoreName } = getNamesForStores()
  return `⚠️You have <code>${saveToKvStorePluginEnabledVarName}</code> enabled, but we couldn't reach your KVStore named <code>${kvStoreName}</code>. <code>${saveToKvStorePluginEnabledVarName}</code> related plugin is not working correctly.`
}

function createEnvVarsInformationElement(env: IntegrationEnv): string {
  let result = ''

  result += '<p>🛠️ Required configuration values:</p>'
  result += '<ul>'
  result += buildConfigurationItem(
    proxySecretVarName,
    {
      isSet: isProxySecretSet(env),
      required: true,
      message: 'Your integration is not working correctly.',
    },
    env
  )
  result += '</ul>'

  result += '<p>🛠️ V3 API configuration values:</p>'
  if (!isScriptDownloadPathSet(env) || !isGetResultPathSet(env)) {
    result += '<p>⚠️ If you are not using the V3 API, these warnings can be safely ignored.</p>'
  }
  result += '<ul>'
  result += buildConfigurationItem(
    agentScriptDownloadPathVarName,
    {
      isSet: isScriptDownloadPathSet(env),
      required: false,
    },
    env
  )
  result += buildConfigurationItem(
    getResultPathVarName,
    {
      isSet: isGetResultPathSet(env),
      required: false,
    },
    env
  )
  result += '</ul>'

  return result
}

async function createPluginConfigurationElement(env: IntegrationEnv): Promise<string> {
  let result = ''
  result += `<p style="display: block">🔌 Plugin configuration values:</p>`

  result += '<ul>'
  result += buildConfigurationItem(
    openClientResponseVarName,
    {
      isSet: isOpenClientResponseSet(env),
      required: false,
      value: env.OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED,
      showValue: true,
      message: 'Open client response plugins are disabled.',
    },
    env
  )
  result += buildConfigurationItem(
    decryptionKeyVarName,
    {
      isSet: isDecryptionKeySet(env),
      required: false,
      message:
        'Open client response plugins are not working correctly. This is required if you want to use Open client response plugins.',
    },
    env
  )

  result += buildConfigurationItem(
    saveToKvStorePluginEnabledVarName,
    {
      isSet: isSaveToKvStorePluginEnabledSet(env),
      required: false,
      value: env.SAVE_TO_KV_STORE_PLUGIN_ENABLED,
      showValue: true,
    },
    env
  )

  if (isOpenClientResponseEnabled(env) && isSaveToKvStorePluginEnabled(env)) {
    const errorMessage = await buildKVStoreCheckMessage()
    if (errorMessage) {
      result += `<li>${errorMessage}</li>`
    }
  }
  result += '</ul>'

  return result
}

async function buildBody(env: IntegrationEnv, styleNonce: string): Promise<string> {
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
  body += await createPluginConfigurationElement(env)

  body += `
  </div>
  </body>
  </html>
  `
  return body
}

export async function handleStatusPage(request: Request, env: IntegrationEnv): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(null, { status: 405 })
  }

  const styleNonce = generateNonce()
  const headers = buildHeaders(styleNonce)
  const body = await buildBody(env, styleNonce)

  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers,
  })
}
