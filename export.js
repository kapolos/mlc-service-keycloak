const axios = require('axios')
const { path, pathOr, last, compose, split } = require('ramda')
const qs = require('querystring')

module.exports = {
  name: 'keycloak',

  methods: {
    async getToken ({ base, username, password, adminRealm = 'master' }) {
      const endpoint = `${base}/realms/${adminRealm}/protocol/openid-connect/token`
      const options = {
        username,
        password,
        grant_type: 'password',
        client_id: 'admin-cli',
      }

      try {
        const resp = await axios.post(endpoint, qs.stringify(options), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

        return path(['data', 'access_token'], resp)
      } catch (e) {
        console.error(e.message)
      }
    }
  },

  actions: {
    test () {
      return 'test'
    },

    /*
    Params:
    {
      server: { base, adminRealm, userRealm, username, password },
      user: { username, email, firstName, lastName, enabled, emailVerified, attributes: { roles, role, ... } }
    }
     */
    async createUser (ctx) {
      const token = await this.getToken(ctx.params.server)

      if (!token) {
        throw new Error('Failed to get token for KeyCloak')
      }

      try {
        const endpoint = `${ctx.params.server.base}/admin/realms/${ctx.params.server.userRealm}/users`
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }

        const resp = await axios.post(endpoint, ctx.params.user, config)

        // Location: https://KEYCLOAK/auth/admin/realms/REALM/users/USER_UUID
        return compose(
          last,
          split('/'),
          pathOr('', ['headers', 'location'])
        )(resp)
      } catch (e) {
        console.error(e)
      }
    }
  }
}
