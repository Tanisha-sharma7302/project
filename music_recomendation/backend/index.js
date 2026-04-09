// const express = require('express')
// const cors = require('cors')
// const dotenv = require('dotenv')

// dotenv.config()

// const app = express()
// const PORT = process.env.PORT || 5000
// const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
// const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

// let spotifyTokenCache = {
//   accessToken: null,
//   expiresAt: 0,
// }

// app.use(cors())
// app.use(express.json())

// const hasSpotifyCredentials = () => Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)

// const getObjectiveEnergy = (objective) => {
//   const objectiveEnergyMap = {
//     focus: 0.45,
//     workout: 0.9,
//     relax: 0.3,
//     'night-drive': 0.62,
//     party: 0.88,
//     meditation: 0.25,
//     morning: 0.65,
//     study: 0.42,
//   }

//   return objectiveEnergyMap[objective] ?? objectiveEnergyMap['night-drive']
// }

// const getSpotifyAccessToken = async () => {
//   if (!hasSpotifyCredentials()) {
//     return null
//   }

//   const now = Date.now()
//   if (spotifyTokenCache.accessToken && spotifyTokenCache.expiresAt > now + 60000) {
//     return spotifyTokenCache.accessToken
//   }

//   const encoded = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
//   const response = await fetch('https://accounts.spotify.com/api/token', {
//     method: 'POST',
//     headers: {
//       Authorization: `Basic ${encoded}`,
//       'Content-Type': 'application/x-www-form-urlencoded',
//     },
//     body: new URLSearchParams({
//       grant_type: 'client_credentials',
//     }),
//   })

//   if (!response.ok) {
//     const message = await response.text()
//     throw new Error(`Spotify auth failed: ${message}`)
//   }

//   const tokenPayload = await response.json()
//   spotifyTokenCache = {
//     accessToken: tokenPayload.access_token,
//     expiresAt: now + tokenPayload.expires_in * 1000,
//   }

//   return spotifyTokenCache.accessToken
// }

// const verifySpotifyCatalogAccess = async () => {
//   if (!hasSpotifyCredentials()) {
//     return {
//       configured: false,
//       available: false,
//       message: 'Spotify credentials missing. Using local recommendation fallback.',
//     }
//   }

//   try {
//     const token = await getSpotifyAccessToken()
//     const testUrl = new URL('https://api.spotify.com/v1/search')
//     testUrl.searchParams.set('q', 'genre:pop')
//     testUrl.searchParams.set('type', 'track')
//     testUrl.searchParams.set('limit', '1')
//     testUrl.searchParams.set('market', 'US')

//     const testResponse = await fetch(testUrl, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     })

//     if (!testResponse.ok) {
//       const rawMessage = await testResponse.text()
//       const message = rawMessage || `Spotify search failed with status ${testResponse.status}`
//       return {
//         configured: true,
//         available: false,
//         message: `Spotify credentials are present, but API access failed: ${message}`,
//       }
//     }

//     return {
//       configured: true,
//       available: true,
//       message: 'Spotify credentials detected. Live Spotify recommendations enabled.',
//     }
//   } catch (error) {
//     return {
//       configured: true,
//       available: false,
//       message: `Spotify check failed: ${error.message}`,
//     }
//   }
// }

// const fetchSpotifyRecommendations = async ({ artists, genres, mood, discovery, objective, intensity }) => {
//   const token = await getSpotifyAccessToken()
//   if (!token) {
//     return []
//   }

//   const queryParts = []
//   const sanitizedArtists = artists.slice(0, 3)
//   const sanitizedGenres = genres.slice(0, 3)

//   for (const artist of sanitizedArtists) {
//     queryParts.push({ query: `artist:${artist}`, sourceGenre: sanitizedGenres[0] || null })
//   }

//   for (const genre of sanitizedGenres) {
//     queryParts.push({ query: `genre:${genre}`, sourceGenre: genre })
//   }

//   if (queryParts.length === 0) {
//     queryParts.push({ query: `genre:pop`, sourceGenre: 'pop' })
//   }

//   const selectedQueries = queryParts.slice(0, 5)
//   const responseSets = await Promise.all(
//     selectedQueries.map(async ({ query, sourceGenre }) => {
//       const url = new URL('https://api.spotify.com/v1/search')
//       url.searchParams.set('q', query)
//       url.searchParams.set('type', 'track')
//       url.searchParams.set('limit', '10')
//       url.searchParams.set('market', 'US')

//       const response = await fetch(url, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       })

//       if (!response.ok) {
//         const message = await response.text()
//         throw new Error(`Spotify search failed (${response.status}): ${message}`)
//       }

//       const payload = await response.json()
//       const items = payload?.tracks?.items || []

//       return items.map((item) => ({
//         id: `sp_${item.id}`,
//         title: item.name,
//         artist: item.artists?.[0]?.name || 'Unknown Artist',
//         genres: sourceGenre ? [sourceGenre] : [],
//         popularity: item.popularity || 0,
//         image: item.album?.images?.[0]?.url || null,
//         previewUrl: item.preview_url || null,
//         externalUrl: item.external_urls?.spotify || null,
//       }))
//     }),
//   )

//   const seen = new Set()
//   const flattened = responseSets.flat().filter((track) => {
//     if (seen.has(track.id)) {
//       return false
//     }
//     seen.add(track.id)
//     return true
//   })

//   const targetEnergy = Math.max(0, Math.min(100, Number(intensity) || 50)) / 100
//   const objectiveEnergy = getObjectiveEnergy(objective)
//   const blendedEnergy = targetEnergy * 0.65 + objectiveEnergy * 0.35

//   return flattened
//     .map((track) => {
//       let score = 0
//       const artistMatch = artists.includes(track.artist)
//       const genreMatch = track.genres.some((genre) => genres.includes(genre))
//       const noveltyBoost = artistMatch ? (100 - discovery) / 100 : discovery / 100
//       const popularityFactor = track.popularity / 100

//       if (artistMatch) score += 3
//       if (genreMatch) score += 2
//       score += popularityFactor * 1.6
//       score += noveltyBoost * 1.3

//       if (mood === 'hyper' || mood === 'energetic') {
//         score += blendedEnergy * 0.8
//       }
//       if (mood === 'chilled' || mood === 'melancholy') {
//         score += (1 - blendedEnergy) * 0.8
//       }

//       return { ...track, score, source: 'spotify' }
//     })
//     .sort((a, b) => b.score - a.score)
//     .slice(0, 8)
// }

// const tracks = [
//   { id: 't1', title: 'Neon Drift', artist: 'Neon Void', genres: ['Synthwave', 'Cyberpunk Techno'], moods: ['hyper', 'energetic'], energy: 0.9 },
//   { id: 't2', title: 'Glass Horizon', artist: 'Vesper Flow', genres: ['Dream Pop', 'Neo-Soul'], moods: ['chilled', 'melancholy'], energy: 0.4 },
//   { id: 't3', title: 'Midnight Circuit', artist: 'The Circuit', genres: ['Glitch', 'Cyberpunk Techno'], moods: ['hyper', 'energetic'], energy: 0.88 },
//   { id: 't4', title: 'Velour Rain', artist: 'Velvet Echo', genres: ['Neo-Soul', 'Lofi Hip Hop'], moods: ['chilled', 'melancholy'], energy: 0.35 },
//   { id: 't5', title: 'Blue Ember', artist: 'Echo Basin', genres: ['Alternative Jazz', 'Liquid D&B'], moods: ['chilled', 'energetic'], energy: 0.62 },
//   { id: 't6', title: 'Voltage Bloom', artist: 'Static Pulse', genres: ['Cyberpunk Techno', 'Synthwave'], moods: ['hyper', 'energetic'], energy: 0.93 },
//   { id: 't7', title: 'Cloud Memory', artist: 'Vesper Flow', genres: ['Dream Pop', 'Lofi Hip Hop'], moods: ['melancholy', 'chilled'], energy: 0.28 },
//   { id: 't8', title: 'Night Relay', artist: 'The Circuit', genres: ['Glitch', 'Liquid D&B'], moods: ['energetic', 'hyper'], energy: 0.82 },
//   { id: 't9', title: 'Echo Parkline', artist: 'Neon Void', genres: ['Synthwave', 'Glitch'], moods: ['energetic', 'hyper'], energy: 0.86 },
//   { id: 't10', title: 'Amber Spill', artist: 'Velvet Echo', genres: ['Alternative Jazz', 'Neo-Soul'], moods: ['melancholy', 'chilled'], energy: 0.33 },
//   { id: 't11', title: 'Pulse Fragments', artist: 'Static Pulse', genres: ['Cyberpunk Techno', 'Liquid D&B'], moods: ['hyper', 'energetic'], energy: 0.91 },
//   { id: 't12', title: 'Faint Aurora', artist: 'Echo Basin', genres: ['Dream Pop', 'Alternative Jazz'], moods: ['melancholy', 'chilled'], energy: 0.42 },
//   { id: 'b1', title: 'Tum Hi Ho', artist: 'Arijit Singh', genres: ['Bollywood', 'Romantic'], moods: ['romantic', 'melancholy'], energy: 0.55 },
//   { id: 'b2', title: 'Baarish Ban Jaana', artist: 'Neha Kakkar', genres: ['Bollywood', 'Romantic'], moods: ['romantic', 'melancholy'], energy: 0.6 },
//   { id: 'b3', title: 'Jhoom Barabar Jhoom', artist: 'Sonu Nigam', genres: ['Bollywood', 'Dance'], moods: ['happy', 'energetic'], energy: 0.85 },
//   { id: 'b4', title: 'Radha', artist: 'Shreya Ghoshal', genres: ['Bollywood', 'Dance'], moods: ['happy', 'energetic'], energy: 0.88 },
//   { id: 'b5', title: 'Ek Ajnabee Haseena Se', artist: 'Atif Aslam', genres: ['Bollywood', 'Romantic'], moods: ['romantic', 'focus'], energy: 0.48 },
//   { id: 'b6', title: 'Kesariya', artist: 'Arijit Singh', genres: ['Bollywood', 'Romantic'], moods: ['romantic', 'happy'], energy: 0.65 },
//   { id: 'b7', title: 'Gallan Goodiyaan', artist: 'Malika Arora', genres: ['Bollywood', 'Dance'], moods: ['happy', 'energetic'], energy: 0.87 },
//   { id: 'b8', title: 'Chaleya', artist: 'Arijit Singh', genres: ['Bollywood', 'Romantic'], moods: ['romantic', 'melancholy'], energy: 0.58 },
//   { id: 'b9', title: 'Mere Haath Mein', artist: 'Shreya Ghoshal', genres: ['Bollywood', 'Romantic'], moods: ['romantic', 'happy'], energy: 0.72 },
//   { id: 'b10', title: 'Saalam-E-Ishq', artist: 'A.R. Rahman', genres: ['Bollywood', 'Fusion'], moods: ['romantic', 'energetic'], energy: 0.78 },
//   { id: 'b11', title: 'Badhaai Ho', artist: 'Arijit Singh', genres: ['Bollywood', 'Happy'], moods: ['happy', 'energetic'], energy: 0.8 },
//   { id: 'b12', title: 'Rang De Basanti', artist: 'A.R. Rahman', genres: ['Bollywood', 'Inspirational'], moods: ['happy', 'focus'], energy: 0.76 },
//   { id: 'i1', title: 'Raag Yaman', artist: 'Ravi Shankar', genres: ['Indian Classical', 'Meditation'], moods: ['melancholy', 'focus'], energy: 0.38 },
//   { id: 'i2', title: 'Tabla Rhythms', artist: 'Zakir Hussain', genres: ['Indian Classical', 'Percussion'], moods: ['focus', 'energetic'], energy: 0.64 },
//   { id: 'i3', title: 'Midnight Raag', artist: 'Pandit Hariprasad Chaurasia', genres: ['Indian Classical', 'Meditation'], moods: ['melancholy', 'chilled'], energy: 0.42 },
//   { id: 'i4', title: 'Sitar Dreams', artist: 'Nikhil Banerjee', genres: ['Indian Classical', 'Ambient'], moods: ['chilled', 'focus'], energy: 0.45 },
//   { id: 'k1', title: 'Dynamite', artist: 'NewJeans', genres: ['K-pop', 'Dance-Pop'], moods: ['energetic', 'happy'], energy: 0.92 },
//   { id: 'k2', title: 'Luck', artist: 'IVE', genres: ['K-pop', 'Girl Group'], moods: ['happy', 'energetic'], energy: 0.88 },
//   { id: 'k3', title: 'God Blessing', artist: 'Stray Kids', genres: ['K-pop', 'Hip-Hop'], moods: ['hyper', 'energetic'], energy: 0.91 },
//   { id: 'k4', title: 'Album', artist: 'aespa', genres: ['K-pop', 'Synth-Pop'], moods: ['energetic', 'hyper'], energy: 0.86 },
//   { id: 'l1', title: 'Tití', artist: 'Bad Bunny', genres: ['Latin', 'Reggaeton'], moods: ['happy', 'energetic'], energy: 0.85 },
//   { id: 'l2', title: 'Ella Baila Sola', artist: 'Eslabon Armado', genres: ['Latin', 'Regional Mexican'], moods: ['happy', 'romantic'], energy: 0.74 },
//   { id: 'l3', title: 'Mamiii', artist: 'Becky G', genres: ['Latin', 'Reggaeton'], moods: ['energetic', 'happy'], energy: 0.84 },
//   { id: 'l4', title: 'La Jumpa', artist: 'J Balvin', genres: ['Latin', 'Urban Latin'], moods: ['happy', 'energetic'], energy: 0.82 },
//   { id: 'a1', title: 'Essence', artist: 'Wizkid', genres: ['Afrobeat', 'Dance'], moods: ['happy', 'energetic'], energy: 0.81 },
//   { id: 'a2', title: 'Last Last', artist: 'Burna Boy', genres: ['Afrobeat', 'Afro-Fusion'], moods: ['melancholy', 'chilled'], energy: 0.58 },
//   { id: 'a3', title: 'Woman', artist: 'Rema', genres: ['Afrobeat', 'Afrobeats'], moods: ['happy', 'romantic'], energy: 0.78 },
//   { id: 'a4', title: 'Essence', artist: 'CKay', genres: ['Afrobeat', 'Afrobeats'], moods: ['chilled', 'romantic'], energy: 0.65 },
//   { id: 'w1', title: 'Heat Waves', artist: 'Glass Animals', genres: ['Indie Pop', 'Psychedelic'], moods: ['chilled', 'melancholy'], energy: 0.62 },
//   { id: 'w2', title: 'Running Up That Hill', artist: 'Plumb', genres: ['Alternative', 'Indie'], moods: ['energetic', 'focus'], energy: 0.76 },
//   { id: 'w3', title: 'Blinding Lights', artist: 'The Weeknd', genres: ['Synthwave', 'Electropop'], moods: ['hyper', 'energetic'], energy: 0.89 },
//   { id: 'w4', title: 'Good as Hell', artist: 'Lizzo', genres: ['Pop', 'Funk'], moods: ['happy', 'energetic'], energy: 0.84 },
// ]

// app.get('/api/health', (_req, res) => {
//   res.json({ ok: true, message: 'Neon Pulse recommendation API online' })
// })

// app.get('/api/spotify/status', async (_req, res) => {
//   const status = await verifySpotifyCatalogAccess()
//   res.json(status)
// })

// app.post('/api/recommendations', async (req, res) => {
//   const { artists = [], genres = [], mood = 'chilled', intensity = 50, profile = {} } = req.body || {}

//   if (!Array.isArray(artists) || !Array.isArray(genres)) {
//     return res.status(400).json({ error: 'artists and genres must be arrays' })
//   }

//   const targetEnergy = Math.max(0, Math.min(100, Number(intensity) || 50)) / 100
//   const discovery = Math.max(0, Math.min(100, Number(profile.discovery) || 0))

//   const objective = typeof profile.objective === 'string' ? profile.objective : 'night-drive'
//   const objectiveEnergy = getObjectiveEnergy(objective)
//   const blendedEnergy = targetEnergy * 0.65 + objectiveEnergy * 0.35

//   try {
//     const spotifyTracks = await fetchSpotifyRecommendations({
//       artists,
//       genres,
//       mood,
//       discovery,
//       objective,
//       intensity,
//     })

//     if (spotifyTracks.length > 0) {
//       const explanation = `Picked ${spotifyTracks.length} Spotify tracks for ${profile.name || 'you'} with mood "${mood}", objective "${objective}", discovery ${discovery}%, and intensity ${Math.round(targetEnergy * 100)}%.`
//       return res.json({ recommendations: spotifyTracks, explanation, source: 'spotify' })
//     }
//   } catch (spotifyError) {
//     console.error('Spotify fetch failed, falling back to local model:', spotifyError.message)
//   }

//   const scored = tracks
//     .map((track) => {
//       let score = 0

//       const artistMatch = artists.includes(track.artist)
//       const matchingGenres = track.genres.filter((genre) => genres.includes(genre)).length
//       const moodMatch = track.moods.includes(mood)
//       const energyDelta = Math.abs(track.energy - blendedEnergy)
//       const noveltyBoost = artists.includes(track.artist)
//         ? (100 - discovery) / 100
//         : discovery / 100

//       if (artistMatch) score += 3.5
//       score += matchingGenres * 2.2
//       if (moodMatch) score += 2.8
//       score += Math.max(0, 1.8 - energyDelta * 3)
//       score += noveltyBoost * 1.4

//       if (objective === 'focus' && track.energy <= 0.62) {
//         score += 0.8
//       }
//       if (objective === 'workout' && track.energy >= 0.72) {
//         score += 0.8
//       }
//       if (objective === 'relax' && track.energy <= 0.45) {
//         score += 0.8
//       }
//       if (objective === 'night-drive' && track.energy >= 0.5 && track.energy <= 0.8) {
//         score += 0.8
//       }

//       return { ...track, score }
//     })
//     .sort((a, b) => b.score - a.score)
//     .slice(0, 8)

//   const explanation = `Picked ${scored.length} local tracks for ${profile.name || 'you'} with mood "${mood}", objective "${objective}", discovery ${discovery}%, and intensity ${Math.round(targetEnergy * 100)}%.`

//   return res.json({ recommendations: scored, explanation, source: 'local' })
// })

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`)
// })



// app.get("/login", (req, res) => {
//   const scope = "user-read-private user-read-email";

//   const authURL =
//     "https://accounts.spotify.com/authorize?" +
//     new URLSearchParams({
//       response_type: "code",
//       client_id: process.env.CLIENT_ID,
//       scope: scope,
//       redirect_uri: process.env.REDIRECT_URI,
//     });

//   res.redirect(authURL);
// });








const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ✅ FIXED: correct env names
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://127.0.0.1:5000/callback'

let spotifyTokenCache = {
  accessToken: null,
  expiresAt: 0,
}

app.use(cors())
app.use(express.json())

// ✅ Check credentials
const hasSpotifyCredentials = () =>
  Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)

// 🎯 Get Spotify Token (Client Credentials Flow)
const getSpotifyAccessToken = async () => {
  if (!hasSpotifyCredentials()) return null

  const now = Date.now()

  if (
    spotifyTokenCache.accessToken &&
    spotifyTokenCache.expiresAt > now + 60000
  ) {
    return spotifyTokenCache.accessToken
  }

  const encoded = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const msg = await response.text()
    throw new Error(`Spotify auth failed: ${msg}`)
  }

  const data = await response.json()

  spotifyTokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return data.access_token
}

// ✅ Spotify Status Check
app.get('/api/spotify/status', async (req, res) => {
  try {
    if (!hasSpotifyCredentials()) {
      return res.json({
        configured: false,
        available: false,
        message: 'Missing Spotify credentials',
      })
    }

    const token = await getSpotifyAccessToken()

    const test = await fetch(
      'https://api.spotify.com/v1/search?q=artist:The%20Weeknd&type=track&limit=1&market=US',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!test.ok) {
      const rawMessage = await test.text()
      return res.json({
        configured: true,
        available: false,
        message: rawMessage || `Spotify API not working (status ${test.status})`,
      })
    }

    res.json({
      configured: true,
      available: true,
      message: 'Spotify connected successfully 🎉',
    })
  } catch (err) {
    res.json({
      configured: true,
      available: false,
      message: err.message,
    })
  }
})

// 🎵 Fetch songs from Spotify
app.get('/api/songs', async (req, res) => {
  try {
    const token = await getSpotifyAccessToken()

    const response = await fetch(
      'https://api.spotify.com/v1/search?q=happy&type=track&limit=10',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const rawMessage = await response.text()
      return res.status(response.status).json({
        error: rawMessage || `Spotify request failed with status ${response.status}`,
      })
    }

    const data = await response.json()

    const songs = data.tracks.items.map((item) => ({
      title: item.name,
      artist: item.artists[0].name,
      url: item.external_urls.spotify,
      image: item.album.images[0]?.url,
    }))

    res.json(songs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ✅ LOGIN ROUTE (fixed placement + env)
app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email'

  const authURL =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID, // ✅ FIXED
      scope: scope,
      redirect_uri: REDIRECT_URI,
    })

  res.redirect(authURL)
})

// ✅ CALLBACK ROUTE (optional but good)
app.get('/callback', (req, res) => {
  res.send('Login successful! You can close this tab.')
})

// ✅ Health route
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend API is running 🚀',
  })
})

// ✅ ALWAYS LAST
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})