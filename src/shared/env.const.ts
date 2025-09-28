import { z } from "zod"

export const appMode = process.env.NODE_ENV
export const isProduction = appMode === "production"

const defaultProxy = 'http://localhost:4000'
const proxy = isProduction ? window.env?.FRIGATE_PROXY : process.env.REACT_APP_FRIGATE_PROXY || defaultProxy
const proxyParsed = z.string().url().safeParse(proxy)
if (!proxyParsed.success) throw Error(`FRIGATE_PROXY must be string and URL. FRIGATE_PROXY:${proxy}`)
export const proxyURL = new URL(proxy || defaultProxy)

const defaultOidpServer = 'http://localhost:4000'
const oidpServer = isProduction ? window.env?.OPENID_SERVER : process.env.REACT_APP_OPENID_SERVER || defaultOidpServer
const oidpServerParsed = z.string().url().safeParse(oidpServer)
if (!oidpServerParsed.success) throw Error(`OPENID_SERVER must be string and URL. OPENID_SERVER:${oidpServer}`)

const defaultClientId = 'local'
const oidpClientId = isProduction ? window.env?.CLIENT_ID : process.env.REACT_APP_CLIENT_ID || defaultClientId

const defaultRealm = 'local'
const oidpRealm = isProduction ? window.env?.REALM : process.env.REACT_APP_REALM || defaultRealm
const parsedRealm = z.string().safeParse(oidpRealm)
if (!parsedRealm.success) throw Error(`REALM must be string and exist. REALM:${oidpRealm}`)
export const oidpSettings = {
    server: oidpServer || '',
    clientId: oidpClientId || '',
    realm: oidpRealm || '',
}