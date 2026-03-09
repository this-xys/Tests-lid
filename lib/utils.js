const groupMetadataCache = new Map()
const lidCache = new Map()
const metadataTTL = 5000 

const decodeJid = (jid) => {
    if (!jid || typeof jid !== 'string') return jid
    return jid.includes(':') ? jid.split(':')[0] + '@' + jid.split('@')[1] : jid
}

const normalizeToJid = (phone) => {
    if (!phone) return null
    const base = typeof phone === 'number' ? phone.toString() : phone.replace(/\D/g, '')
    return base ? `${base}@s.whatsapp.net` : null
}

export async function resolveLidToRealJid(client, chatJid, candidateJid) {
    const jid = decodeJid(candidateJid)
    if (!jid) return jid
    
    if (jid.endsWith('@s.whatsapp.net')) return jid
    if (!jid.endsWith('@lid') || !chatJid?.endsWith('@g.us')) return jid
    
    if (lidCache.has(jid)) return lidCache.get(jid)

    try {
        let cached = groupMetadataCache.get(chatJid)
        let meta = (cached && (Date.now() - cached.timestamp < metadataTTL)) ? cached.metadata : null

        if (!meta) {
            meta = await client.groupMetadata(chatJid)
            groupMetadataCache.set(chatJid, { metadata: meta, timestamp: Date.now() })
        }

        const participants = Array.isArray(meta?.participants) ? meta.participants : []
        const lidBase = jid.split('@')[0]

        const found = participants.find(p => {
            const pid = decodeJid(p?.id || '')
            const plid = decodeJid(p?.lid || '')
            return pid === jid || plid === jid || pid.split('@')[0] === lidBase
        })

        if (found) {
            let realNumber = found.phoneNumber ? normalizeToJid(found.phoneNumber) : (found.id.endsWith('@s.whatsapp.net') ? decodeJid(found.id) : null)
            if (realNumber) {
                lidCache.set(jid, realNumber)
                return realNumber
            }
        }
        
        const [onWa] = await client.onWhatsApp(jid.split('@')[0])
        if (onWa && onWa.exists) {
            const fixed = decodeJid(onWa.jid)
            lidCache.set(jid, fixed)
            return fixed
        }

    } catch (e) {}

    if (jid.endsWith('@lid')) {
        const forcePn = jid.split('@')[0] + '@s.whatsapp.net'
        lidCache.set(jid, forcePn)
        return forcePn
    }

    return jid
}

export async function pickTargetJid(m, client) {
    const chatJid = decodeJid(m?.chat || m?.key?.remoteJid || m?.from || '')
    const ctx = m?.message?.extendedTextMessage?.contextInfo || m?.msg?.contextInfo || {}

    let raw = ''
    const mentioned = m?.mentionedJid || ctx?.mentionedJid || ctx?.mentionedJidList || []
    
    if (Array.isArray(mentioned) && mentioned.length) {
        raw = mentioned[0]
    } else if (m?.quoted || ctx?.participant) {
        raw = m?.quoted?.sender || m?.quoted?.participant || ctx?.participant || m?.quoted?.key?.participant || ''
    } else if (client?.parseMention) {
        const text = m?.text || m?.body || m?.message?.conversation || ''
        const parsed = client.parseMention(String(text))
        if (parsed?.length) raw = parsed[0]
    }

    if (raw) {
        return await resolveLidToPnJid(client, chatJid, raw)
    } else {
        const sender = m?.sender || m?.key?.participant || m?.key?.remoteJid || ''
        return await resolveLidToPnJid(client, chatJid, sender)
    }
}
