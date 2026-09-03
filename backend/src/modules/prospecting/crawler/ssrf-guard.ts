import { Injectable, Logger } from '@nestjs/common'
import { promises as dns } from 'dns'
import { isIP } from 'net'

/**
 * Bloqueia SSRF: resolve o host via DNS e rejeita qualquer IP privado,
 * loopback, link-local ou reservado antes de permitir uma requisição HTTP.
 * Deve ser chamado antes da requisição inicial e a cada hop de redirect.
 */
@Injectable()
export class SsrfGuard {
  private readonly logger = new Logger(SsrfGuard.name)

  async assertSafeUrl(rawUrl: string): Promise<URL> {
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      throw new Error(`URL inválida: ${rawUrl}`)
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`Protocolo não permitido: ${url.protocol}`)
    }

    const hostname = url.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '0.0.0.0') {
      throw new Error(`Host bloqueado (SSRF): ${hostname}`)
    }

    const ipVersion = isIP(hostname)
    const addresses: string[] = ipVersion
      ? [hostname]
      : (await dns.lookup(hostname, { all: true })).map(a => a.address)

    for (const address of addresses) {
      if (this.isPrivateOrReservedIp(address)) {
        throw new Error(`Endereço IP bloqueado (SSRF): ${hostname} -> ${address}`)
      }
    }

    return url
  }

  isPrivateOrReservedIp(address: string): boolean {
    const version = isIP(address)
    if (version === 4) return this.isPrivateIpv4(address)
    if (version === 6) return this.isPrivateIpv6(address)
    return true
  }

  private isPrivateIpv4(address: string): boolean {
    const parts = address.split('.').map(Number)
    if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return true
    const [a, b] = parts

    if (a === 127) return true // loopback
    if (a === 10) return true // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true // RFC1918
    if (a === 192 && b === 168) return true // RFC1918
    if (a === 169 && b === 254) return true // link-local
    if (a === 0) return true // "this" network
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    if (a >= 224) return true // multicast/reserved

    return false
  }

  private isPrivateIpv6(address: string): boolean {
    const normalized = address.toLowerCase()
    if (normalized === '::1') return true // loopback
    if (normalized.startsWith('::ffff:')) {
      return this.isPrivateIpv4(normalized.replace('::ffff:', ''))
    }
    if (normalized.startsWith('fe80:')) return true // link-local
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // unique local
    return false
  }
}
