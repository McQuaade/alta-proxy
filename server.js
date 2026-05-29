require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cors = require('cors')

const app = express()
app.use(express.json())

app.use(cors({
  origin: '*',
}))

const ALTA_BASE = `https://${process.env.ALTA_HOST}/api/v1`
let sessionCookie = null
let lastLogin = null

async function ensureLoggedIn() {
  const tenMinutes = 10 * 60 * 1000
  if (sessionCookie && lastLogin && (Date.now() - lastLogin) < tenMinutes) {
    return
  }
  const res = await axios.post(`${ALTA_BASE}/dologin`, {
    username: process.env.ALTA_USERNAME,
    password: process.env.ALTA_PASSWORD
  }, {
    withCredentials: true,
    validateStatus: s => s < 500
  })
  const cookies = res.headers['set-cookie']
  if (!cookies) throw new Error('Login fejlede — tjek brugernavn/password')
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')
  lastLogin = Date.now()
  console.log('Logget ind på Alta')
}

async function altaGet(path) {
  await ensureLoggedIn()
  const res = await axios.get(`${ALTA_BASE}${path}`, {
    headers: { Cookie: sessionCookie },
    validateStatus: s => s < 500
  })
  if (res.status === 401) {
    sessionCookie = null
    await ensureLoggedIn()
    return altaGet(path)
  }
  return res.data
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Alta proxy kører', host: process.env.ALTA_HOST })

// Debug: test arbitrary Alta endpoint
app.get('/api/raw/*', async (req, res) => {
  try {
    const altaPath = '/' + req.params[0]
    const data = await altaGet(altaPath)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
})

// Kameraer / devices
app.get('/api/cameras', async (req, res) => {
  try {
    const data = await altaGet('/devices')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Alarmer
app.get('/api/alarms', async (req, res) => {
  try {
    const data = await altaGet('/alerts')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Events
app.get('/api/events', async (req, res) => {
  try {
    const data = await altaGet('/events')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// System info
app.get('/api/about', async (req, res) => {
  try {
    const data = await altaGet('/about')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Brugere
app.get('/api/users', async (req, res) => {
  try {
    const data = await altaGet('/users')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }

  }
})
// LPR events
app.get('/api/lpr', async (req, res) => {
  try {
    const data = await altaGet('/alerts?type=lpr')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
// Counting areas
app.get('/api/counting', async (req, res) => {
  try {
    const data = await altaGet('/counting_areas')
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
})

// Webhook modtager fra Alta
app.post('/api/webhook', (req, res) => {
  console.log('Webhook modtaget:', JSON.stringify(req.body))
  res.json({ received: true })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Alta proxy kører på port ${PORT}`)
  console.log(`Alta server: ${process.env.ALTA_HOST}`)
})
