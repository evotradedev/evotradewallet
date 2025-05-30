import React, { useState, useEffect } from 'react'

import { Slide, SlideBody, SlideItem, Shortcut } from '../../styled'

import link from '../../../../../resources/link'

import { getDisplayShortcut } from '../../../../../resources/keyboard'

const Access = ({ setTitle, setProceed, platform }) => {
  const { modifierKeys, shortcutKey } = getDisplayShortcut(platform, store('main.shortcuts.summon'))
  const keyboardShortcut = modifierKeys.concat(shortcutKey).join(' + ')
  const [shortcutActivated, setShortcutActivated] = useState(false)
  const [trayOpen, setTrayOpen] = useState(store('tray.open'))

  useEffect(() => {
    const handler = (event) => {
      if (event === 'shortcutActivated') setShortcutActivated(true)
    }

    link.send('tray:action', 'navDash', { view: 'settings', data: {} })
    link.on('flex', handler)

    const obs = store.observer(() => {
      setTrayOpen(store('tray.open'))
    })

    return () => {
      link.off('flex', handler)
      obs.remove()
    }
  }, [])

  useEffect(() => {
    if (trayOpen && !shortcutActivated) {
      setTitle(`Let's get started...`)
      setProceed({ action: 'skip', text: 'skip this step' })
    } else if (!trayOpen) {
      setTitle('Summon EvoTradeWallet')
      setProceed({ action: 'skip', text: 'skip this step' })
    } else {
      setTitle('Auto-hide')
      setProceed({ action: 'next', text: 'Next' })
    }
  }, [trayOpen, shortcutActivated])

  return (
    <Slide>
      {trayOpen && !shortcutActivated ? (
        <SlideBody key={1}>
          <SlideItem>
            <div>You can quickly summon and dismiss</div>
            <div>EvoTradeWallet using the keyboard shortcut.</div>
          </SlideItem>
          <SlideItem>
            <span>{'Dismiss EvoTradeWallet now using '}</span>
            <Shortcut>{keyboardShortcut}</Shortcut>
          </SlideItem>
        </SlideBody>
      ) : !trayOpen ? (
        <SlideBody key={2}>
          <SlideItem>
            <span>{'You can summon EvoTradeWallet the same way '}</span>
            <Shortcut>{keyboardShortcut}</Shortcut>
          </SlideItem>
        </SlideBody>
      ) : (
        <SlideBody key={3}>
          <SlideItem>
            <div>You can also set EvoTradeWallet to automatically hide</div>
            <div>when not in use, so it's out of the way</div>
            <div>but still easily accessible when you need it.</div>
          </SlideItem>
        </SlideBody>
      )}
    </Slide>
  )
}

export default Access
