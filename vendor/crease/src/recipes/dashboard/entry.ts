import { Effect, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import {
  Flags,
  Message,
  Model,
  init,
  update,
  view,
  subscriptions,
  defaultSettings,
  seedUsers,
} from './main'
import { User, Settings } from './data'
import './dashboard.css'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
})
Runtime.run(application, {
  flags: Effect.sync(() => {
    let data = {
      users: seedUsers as readonly User[],
      settings: defaultSettings,
    }
    let isDark = false
    try {
      const saved = localStorage.getItem('forma-demo')
      if (saved)
        data = S.decodeUnknownSync(
          S.Struct({ users: S.Array(User), settings: Settings }),
        )(JSON.parse(saved))
      isDark = localStorage.getItem('forma-theme') === 'dark'
    } catch {
      /* Start with the demo data when storage is missing or invalid. */
    }
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    return {
      ...data,
      isDark,
      sidebarOpen: !document.cookie.includes('forma_sidebar=false'),
    }
  }),
})
