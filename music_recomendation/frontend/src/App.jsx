import { useEffect, useMemo, useState } from 'react'
import './App.css'

const artistSeed = [
  {
    name: 'Arijit Singh',
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
  },
  {
    name: 'Shreya Ghoshal',
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
  },
  {
    name: 'A.R. Rahman',
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
  },
  {
    name: 'Static Pulse',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBsTymT42kSxUlZtyY4RoZrLOk6Yk-WBSmFC2DyBI-kPA1uwv_Y4CKVsPF0ue1yCvMXd-GHvQAgwf3stFkEGMEqMDF6rbCg5qCNwL2S71KQ8NYhZaXYEBcz3FP-7k_3do3ZJ8kkXtI8-lhrcCHXXp_neZ-ufpXZYi-vtRCKgDz-056_jM0hnsSkSCASTyxFHN7DlIQT1DSwoVspuLs5SnQ4LpsaoaQEUuOwfiMgmOmgCE9XTJZErUQ_CWws4i8nOOEsmlX_ARgfkw',
  },
  {
    name: 'Velvet Echo',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDJKtw1B1fDOdiozO1PA-eXcIP-krpXaXANRerx867eYLLXnb39PmbzX9WXWMzXBSvfYglbqVJshFZ722QNnf7IPCeTH5cFUkMhfURciDHzy6RDu4PRUYPbzzOV_drO8k0ybdw3_ZJWTnnWz9dlu5LUD98EJD65XiQ-N4ZMEZ7MalT8XeoYDmRR4WafHYxKXGHFT-qCt7Uwth2H1L1Zvr-ey1V32gfWLHBw0p1Zk8PmhkYEGcon-BPVGNuS81yKyZPkYKPWpoSP0Q',
  },
  {
    name: 'The Circuit',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA5Gf9nM0oTWFD9W154KU0H3ryWP4y3dkeN6CslUKKysWQvsJbG8rIwFxuhwClmh4i8cVvt_VZUrEWpp8AnZanammP9-WZrI5Fh3zeo5KP1iV1KzcXuYj0oprIWKfClXw60K49JGDCy8uEGd8lEHnWZEMFs2t87UtCOuvjeuQ5mXEPSc5jPfOU5AtF4cHzY576swdqTTdBChPWvZKKLKNi29e2czlKeKKkj-epPklldMoC1kb-zxlHl1FQwkLQHPzl5mUrvqHBwRQ',
  },
]

const genreSeed = [
  'Synthwave',
  'Bollywood',
  'Cyberpunk Techno',
  'Indian Classical',
  'Liquid D&B',
  'Dream Pop',
  'Romantic',
  'Glitch',
]

const moods = [
  { id: 'energetic', emoji: '🔥', label: 'Energetic' },
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'romantic', emoji: '💕', label: 'Romantic' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'chilled', emoji: '🌊', label: 'Chilled' },
  { id: 'hyper', emoji: '⚡', label: 'Hyper' },
  { id: 'melancholy', emoji: '🌙', label: 'Melancholy' },
  { id: 'focus', emoji: '🎯', label: 'Focus' },
]

const listeningGoals = [
  { id: 'focus', emoji: '📚', label: 'Deep Focus' },
  { id: 'workout', emoji: '💪', label: 'Workout' },
  { id: 'relax', emoji: '🧘', label: 'Relax' },
  { id: 'night-drive', emoji: '🌃', label: 'Night Drive' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'meditation', emoji: '🕉️', label: 'Meditation' },
  { id: 'morning', emoji: '🌅', label: 'Morning Energy' },
  { id: 'study', emoji: '🎓', label: 'Study' },
]

const defaultProfile = {
  objective: 'night-drive',
  discovery: 45,
}

function App() {
  const [selectedArtists, setSelectedArtists] = useState(['Arijit Singh', 'Static Pulse'])
  const [selectedGenres, setSelectedGenres] = useState(['Bollywood'])
  const [selectedMood, setSelectedMood] = useState('hyper')
  const [pulseIntensity, setPulseIntensity] = useState(84)
  const [search, setSearch] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(defaultProfile)
  const [spotifyStatus, setSpotifyStatus] = useState({
    configured: false,
    available: false,
    message: 'Checking Spotify integration...',
  })

  useEffect(() => {
    const rawProfile = window.localStorage.getItem('neon-pulse-profile')
    if (!rawProfile) {
      return
    }

    try {
      const parsed = JSON.parse(rawProfile)
      setProfile({ ...defaultProfile, ...parsed })
    } catch {
      setProfile(defaultProfile)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('neon-pulse-profile', JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    const loadSpotifyStatus = async () => {
      try {
        const response = await fetch('/api/spotify/status')
        const payload = await response.json()
        setSpotifyStatus(payload)
      } catch {
        setSpotifyStatus({
          configured: false,
          available: false,
          message: 'Unable to reach backend Spotify status endpoint.',
        })
      }
    }

    loadSpotifyStatus()
  }, [])

  const visibleArtists = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) {
      return artistSeed
    }

    return artistSeed.filter((artist) => artist.name.toLowerCase().includes(normalized))
  }, [search])

  const toggleArtist = (artistName) => {
    setSelectedArtists((current) => {
      if (current.includes(artistName)) {
        return current.filter((name) => name !== artistName)
      }
      return [...current, artistName]
    })
  }

  const toggleGenre = (genre) => {
    setSelectedGenres((current) => {
      if (current.includes(genre)) {
        return current.filter((item) => item !== genre)
      }
      return [...current, genre]
    })
  }

  const generateRecommendations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artists: selectedArtists,
          genres: selectedGenres,
          mood: selectedMood,
          intensity: pulseIntensity,
          profile,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to generate recommendations')
      }

      setRecommendations(payload.recommendations)
      setExplanation(payload.explanation)
    } catch (requestError) {
      setRecommendations([])
      setExplanation('')
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const profileTitle = 'The Neon Pulse'

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">{profileTitle}</div>
        <div className="search-wrap">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Search artists..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <main className="content">
        <section className="hero-block">
          <h1>
            What sounds like <span>YOU?</span>
          </h1>
          <p>
            Select artists, genres, and your current vibe. The recommendation engine blends these
            signals and returns tracks that match your pulse.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Personalize My Pulse</h2>
            <p>These preferences are saved automatically on your device</p>
          </div>

          <div className="profile-grid">
            <div className="full-row">
              <h3>Listening Goal</h3>
              <div className="listening-goals-grid">
                {listeningGoals.map((goal) => (
                  <button
                    key={goal.id}
                    className={`listening-goal-card ${profile.objective === goal.id ? 'selected' : ''}`}
                    type="button"
                    onClick={() => setProfile((current) => ({ ...current, objective: goal.id }))}
                  >
                    <span>{goal.emoji}</span>
                    <small>{goal.label}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="full-row">
              <div className="discovery-slider-wrap">
                <div className="discovery-header">
                  <label htmlFor="discovery-range">Discovery Mode</label>
                  <span className="discovery-value">New: {profile.discovery}% | Familiar: {100 - profile.discovery}%</span>
                </div>
                <input
                  id="discovery-range"
                  type="range"
                  min="0"
                  max="100"
                  value={profile.discovery}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, discovery: Number(event.target.value) }))
                  }
                  className="discovery-input"
                />
              </div>
            </div>

            <div className="full-row">
              <div className={`spotify-status ${spotifyStatus.available ? 'ok' : 'warn'}`}>
                {spotifyStatus.message}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Pick your Icons</h2>
            <p>Select 3 or more artists you love</p>
          </div>
          <div className="artist-grid">
            {visibleArtists.map((artist) => {
              const selected = selectedArtists.includes(artist.name)
              return (
                <button
                  key={artist.name}
                  className={`artist-card ${selected ? 'selected' : ''}`}
                  type="button"
                  onClick={() => toggleArtist(artist.name)}
                >
                  <img src={artist.image} alt={artist.name} />
                  <span>{artist.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="split">
          <div className="panel">
            <div className="panel-head">
              <h2>Sonic Genres</h2>
            </div>
            <div className="genre-wrap">
              {genreSeed.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={`genre-chip ${selectedGenres.includes(genre) ? 'selected' : ''}`}
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Current Vibe</h2>
            </div>
            <div className="mood-grid">
              {moods.map((mood) => (
                <button
                  key={mood.id}
                  className={`mood-card ${selectedMood === mood.id ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedMood(mood.id)}
                >
                  <span>{mood.emoji}</span>
                  <small>{mood.label}</small>
                </button>
              ))}
            </div>

            <div className="intensity">
              <label htmlFor="pulse-range">Pulse Intensity: {pulseIntensity}%</label>
              <input
                id="pulse-range"
                type="range"
                min="0"
                max="100"
                value={pulseIntensity}
                onChange={(event) => setPulseIntensity(Number(event.target.value))}
              />
            </div>
          </div>
        </section>

        <div className="cta-wrap">
          <button className="cta" type="button" onClick={generateRecommendations} disabled={loading}>
            {loading ? 'Generating...' : 'Generate My Sound'}
          </button>
        </div>

        {error ? <p className="status error">{error}</p> : null}
        {explanation ? <p className="status">{explanation}</p> : null}

        {recommendations.length > 0 ? (
          <section className="panel">
            <div className="panel-head">
              <h2>Your Recommendations</h2>
              <p>
                Generated using mood, artists, genres, and your profile preferences
              </p>
            </div>

            <div className="results">
              {recommendations.map((track) => (
                <article key={track.id} className="track-card">
                  <h3>{track.title}</h3>
                  <p>{track.artist}</p>
                  <div className="tags">
                    {track.genres.map((genre) => (
                      <span key={`${track.id}-${genre}`}>{genre}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="mobile-nav">
        <span>Home</span>
        <span className="active">Explore</span>
        <span>Library</span>
      </footer>
    </div>
  )
}

export default App
