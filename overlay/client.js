const messagesEl = document.getElementById('messages')
const searchEl = document.getElementById('search')
const filters = { twitch: true, youtube: true, tiktok: true }

document.querySelectorAll('input[type=checkbox][data-filter]').forEach(cb => {
  cb.addEventListener('change', () => {
    filters[cb.dataset.filter] = cb.checked
    render()
  })
})
searchEl.addEventListener('input', render)

const store = []
const MAX_MSG = 200
let socket

function connect() {
  const url = (new URLSearchParams(location.search)).get('ws') || 'ws://localhost:8787'
  socket = new WebSocket(url)
  socket.addEventListener('open', () => console.log('[overlay] connected', url))
  socket.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data)
      if (!data?.message) return
      store.push(data)
      while (store.length > MAX_MSG) store.shift()
      renderOne(data)
    } catch {}
  })
  socket.addEventListener('close', () => {
    console.log('[overlay] ws closed, retry in 2s')
    setTimeout(connect, 2000)
  })
}
connect()

function passFilters(m) {
  if (!filters[m.platform]) return false
  const q = (searchEl.value || '').toLowerCase()
  if (!q) return true
  return (m.username || '').toLowerCase().includes(q) || (m.message || '').toLowerCase().includes(q)
}

function render() {
  messagesEl.innerHTML = ''
  for (const m of store) if (passFilters(m)) messagesEl.appendChild(renderMsg(m))
}

function renderOne(m) {
  if (!passFilters(m)) return
  messagesEl.appendChild(renderMsg(m))
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function renderMsg(m) {
  const li = document.createElement('li')
  li.className = 'msg'

  const avatar = document.createElement('div')
  avatar.className = 'avatar'
  if (m.avatar) avatar.style.backgroundImage = `url(${m.avatar})`
  avatar.style.backgroundSize = 'cover'

  const content = document.createElement('div')
  content.className = 'content'

  const meta = document.createElement('div')
  meta.className = 'meta'
  const uname = document.createElement('span')
  uname.className = 'username'
  uname.textContent = m.username || 'anonymous'
  meta.appendChild(uname)

  // Add platform to private template messages
  const params = new URLSearchParams(location.search)
  const mode = params.get('mode') || 'private'
  document.body.classList.add(mode)
  if (mode === 'private') {
    const plat = document.createElement('span')
    plat.className = 'platform'
    plat.textContent = m.platform
    meta.appendChild(plat)
  }

  const text = document.createElement('div')
  text.className = 'text'
  text.textContent = m.message

  content.appendChild(meta)
  content.appendChild(text)

  li.appendChild(avatar)
  li.appendChild(content)

  const messages = document.getElementById('messages')
  if (!messages) return

  messages.appendChild(li)

  // Auto-scroll
  if (mode === 'private') {
  const messages = document.getElementById('messages')
    messages.scrollTop = 0 // because column-reverse puts "latest" at the visual bottom
  }

  return li
}

