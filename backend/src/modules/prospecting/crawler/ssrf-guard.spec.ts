import { SsrfGuard } from './ssrf-guard'

describe('SsrfGuard', () => {
  const guard = new SsrfGuard()

  it('bloqueia localhost', async () => {
    await expect(guard.assertSafeUrl('http://localhost/admin')).rejects.toThrow(/SSRF/)
  })

  it('bloqueia IP de loopback', async () => {
    await expect(guard.assertSafeUrl('http://127.0.0.1/secret')).rejects.toThrow(/SSRF/)
  })

  it('bloqueia faixas RFC1918 (10.x, 172.16-31.x, 192.168.x)', async () => {
    await expect(guard.assertSafeUrl('http://10.0.0.5/')).rejects.toThrow(/SSRF/)
    await expect(guard.assertSafeUrl('http://172.16.5.1/')).rejects.toThrow(/SSRF/)
    await expect(guard.assertSafeUrl('http://192.168.1.1/')).rejects.toThrow(/SSRF/)
  })

  it('bloqueia link-local (169.254.x)', async () => {
    await expect(guard.assertSafeUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/SSRF/)
  })

  it('bloqueia protocolos que não sejam http/https', async () => {
    await expect(guard.assertSafeUrl('file:///etc/passwd')).rejects.toThrow(/Protocolo/)
  })

  it('bloqueia loopback IPv6', () => {
    expect(guard.isPrivateOrReservedIp('::1')).toBe(true)
  })

  it('permite IPs públicos', () => {
    expect(guard.isPrivateOrReservedIp('8.8.8.8')).toBe(false)
    expect(guard.isPrivateOrReservedIp('1.1.1.1')).toBe(false)
  })

  it('rejeita host malformado', async () => {
    await expect(guard.assertSafeUrl('not-a-url')).rejects.toThrow(/inválida/)
  })
})
