// Vercel serverless function for GitHub OAuth token exchange
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Code required' })
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description })
    }

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    const user = await userRes.json()

    res.status(200).json({
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        email: user.email,
      },
      token: tokenData.access_token,
    })
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    res.status(500).json({ error: 'Authentication failed' })
  }
}
