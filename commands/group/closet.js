export default {
  command: ['closet', 'close', 'cerrar'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chatJid = (typeof decodeJid === 'function') ? decodeJid(m.chat) : m.chat
      const timeout = args[0] ? msParser(args[0]) : 0

      if (args[0] && !timeout) {
        return client.reply(chatJid, 'Formato inválido. Usa por ejemplo: 10s, 5m, 2h, 1d', m)
      }

      const groupMetadata = await client.groupMetadata(chatJid)
      const groupAnnouncement = groupMetadata.announce

      if (groupAnnouncement === true) {
        return client.reply(chatJid, `《✧》 El grupo ya está cerrado.`, m)
      }

      const applyAction = async () => {
        await client.groupSettingUpdate(chatJid, 'announcement')
        return client.reply(chatJid, `✿ El grupo ha sido cerrado correctamente.`, m)
      }

      if (timeout > 0) {
        await client.reply(chatJid, `❀ El grupo se cerrará en ${clockString(timeout)}.`, m)
        
        setTimeout(async () => {
          try {
            const md = await client.groupMetadata(chatJid)
            if (md.announce === true) return
            await client.groupSettingUpdate(chatJid, 'announcement')
          } catch (e) {
            console.error('Error en cierre programado:', e)
          }
        }, timeout)
      } else {
        await applyAction()
      }
    } catch (e) {
      return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*.\n> [Error: *${e.message}*]`)
    }
  },
}

function msParser(str) {
  const match = str.match(/^(\d+)([smhd])$/i)
  if (!match) return null
  const num = parseInt(match[1])
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 's': return num * 1000
    case 'm': return num * 60 * 1000
    case 'h': return num * 60 * 60 * 1000
    case 'd': return num * 24 * 60 * 60 * 1000
    default: return null
  }
}

function clockString(ms) {
  const d = Math.floor(ms / 86400000)
  const h = Math.floor(ms / 3600000) % 24
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  let parts = []
  if (d > 0) parts.push(`${d} ${d === 1 ? 'día' : 'días'}`)
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`)
  if (s > 0) parts.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`)
  return parts.join(' ')
}
