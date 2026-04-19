// Vercel serverless function for GitHub OAuth token exchange.
// Hardened: env-var presence checks, consistent error shape, upstream failure handling.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'GitHub OAuth is not configured on the server.',
      hint: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the deployment environment.',
    })
  }

  const code = req.body?.code
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid authorization code.' })
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    })

    if (!tokenRes.ok) {
      return res.status(502).json({
        error: `GitHub rejected the token exchange (${tokenRes.status}).`,
      })
    }

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      // GitHub spec: error, error_description, error_uri
      return res.status(400).json({
        error: tokenData.error_description || tokenData.error || 'GitHub OAuth failed.',
      })
    }

    const accessToken = tokenData.access_token
    if (!accessToken) {
      return res.status(502).json({ error: 'GitHub did not return an access token.' })
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'codebase-city',
      },
    })

    if (!userRes.ok) {
      return res.status(502).json({
        error: `Could not fetch user profile from GitHub (${userRes.status}).`,
      })
    }

    const user = await userRes.json()
    if (!user?.id || !user?.login) {
      return res.status(502).json({ error: 'GitHub returned an unexpected user payload.' })
    }

    return res.status(200).json({
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        email: user.email,
      },
      token: accessToken,
    })
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    return res.status(500).json({ error: 'Authentication failed. Please try again.' })
  }
}
