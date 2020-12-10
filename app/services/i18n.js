/**
 * @version 0.9
 */
import i18n from 'i18n-js'
import moment from 'moment'
import store from '../store'
import * as RNLocalize from 'react-native-localize'

import en from '../../locales/en.json'
import ru from '../../locales/ru.json'
import uk from '../../locales/uk.json'

i18n.defaultLocale = 'en'

store.subscribe(() => {
    const language = store.getState().settingsStore.data.language

    if (typeof language !== 'undefined' && i18n.locale.toString() !== language.toString()) {
        i18n.locale = language
        setupMoment()
    }
})

const locales = RNLocalize.getLocales()
if (Array.isArray(locales)) {
    i18n.locale = locales[0].languageTag
}

i18n.fallbacks = true
i18n.translations = { en, ru, uk }

export function strings(name, params = {}) {
    return i18n.t(name, params)
}

export function sublocale(locale) {
    if (typeof locale === 'undefined' || !locale) {
        locale = i18n.locale
    }
    let sub = locale.split('-')[0]
    if (sub !== 'uk' && sub !== 'ru') {
        sub = 'en'
    }
    return sub
}

function setupMoment() {
    const subloc = sublocale()
    moment.locale(subloc, {
        calendar: {
            lastDay: `[${strings('notifications.yesterday')}]`,
            sameDay: `[${strings('notifications.today')}]`,
            lastWeek: subloc === 'en' ? 'MMM DD, YYYY' : 'MMMM DD, YYYY',
            sameElse: subloc === 'en' ? 'MMM DD, YYYY' : 'MMMM DD, YYYY',
        }
    })
}
setupMoment()

export default i18n
