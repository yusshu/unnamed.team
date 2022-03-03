module.exports = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  env: {
    // invite for our Discord server
    discordInvite: 'https://discord.gg/9hS9DKY9vg',

    // our GitHub organization slug
    // https://github.com/unnamed/
    githubSlug: 'unnamed'
  },
  async redirects() {
    return [
      {
        source: '/donate',
        destination: 'https://paypal.me/yushu7u7',
        permanent: true,
        basePath: false
      },
      {
        source: '/youtube',
        destination: 'https://www.youtube.com/channel/UCPApMf-HqCk5JtjzlG9HvSQ',
        permanent: true,
        basePath: false
      },
      {
        source: '/emojis',
        destination: '/project/glyphs',
        permanent: true
      }
    ];
  }
};
