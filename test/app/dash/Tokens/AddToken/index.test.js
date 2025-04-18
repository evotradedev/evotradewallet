import Restore from 'react-restore'

import { screen, render, waitFor } from '../../../../componentSetup'
import store from '../../../../../main/store'
import link from '../../../../../resources/link'
import AddTokenComponent from '../../../../../app/dash/Tokens/AddToken'

jest.mock('../../../../../main/store/persist')
jest.mock('../../../../../resources/link', () => ({
  invoke: jest.fn().mockResolvedValue({}),
  send: jest.fn()
}))

const AddToken = Restore.connect(AddTokenComponent, store)

beforeAll(() => {
  store.addNetwork({
    id: 1,
    type: 'ethereum',
    name: 'Mainnet',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    on: true,
    connection: {
      primary: { connected: true }
    }
  })

  store.setPrimary('ethereum', 1, { connected: false })
  store.activateNetwork('ethereum', 1, true)

  store.removeNetwork({ type: 'ethereum', id: 137 })
  store.addNetwork({
    id: 137,
    type: 'ethereum',
    name: 'Polygon',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    on: true,
    connection: {
      primary: { connected: true }
    },
    primaryColor: 'accent7'
  })

  store.setPrimary('ethereum', 137, { connected: false })
  store.activateNetwork('ethereum', 137, true)
})

describe('selecting token chain', () => {
  it('should display the expected chain IDs', () => {
    render(<AddToken />)

    const tokenChainNames = screen.getAllByRole('button').map((el) => el.textContent)
    expect(tokenChainNames).toEqual(['Mainnet', 'Polygon'])
  })

  it('should update add token navigation when a chain is selected', async () => {
    // 200 ms UI delay after clicking the button to select a chain
    const { user } = render(<AddToken />, { advanceTimersAfterInput: true })

    const polygonButton = screen.getByRole('button', { name: 'Polygon' })
    await user.click(polygonButton)

    expect(link.send).toHaveBeenCalledWith('tray:action', 'navDash', {
      view: 'tokens',
      data: {
        notify: 'addToken',
        notifyData: {
          chain: {
            id: 137,
            name: 'Polygon',
            color: 'accent7'
          }
        }
      }
    })
  })
})

describe('setting token address', () => {
  it('should prompt for a contract address if a chain has been selected', () => {
    render(<AddToken data={{ notifyData: { chain: { id: 137 } } }} />)

    const contractAddressInput = screen.getByLabelText(`Enter token's address`)
    expect(contractAddressInput.textContent).toBe('')
  })

  it('should update add token navigation with an error when a user submits an invalid contract address', async () => {
    const { user } = render(<AddToken data={{ notifyData: { chain: { id: 1 } } }} />)

    const contractAddressInput = screen.getByLabelText(`Enter token's address`)
    await user.type(contractAddressInput, 'INVALID_ADDRESS')
    const setAddressButton = screen.getByRole('button', { name: 'Set Address' })
    await user.click(setAddressButton)

    expect(link.send).toHaveBeenCalledTimes(1)
    expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
      view: 'tokens',
      data: {
        notify: 'addToken',
        notifyData: {
          chain: { id: 1 },
          address: 'INVALID_ADDRESS',
          error: 'INVALID CONTRACT ADDRESS'
        }
      }
    })
  })

  it('should update add token navigation when a contracts details cannot be validated on-chain', async () => {
    store.setPrimary('ethereum', 1, { connected: true })
    link.invoke.mockImplementationOnce((action, address, chainId) => {
      expect(action).toBe('tray:getTokenDetails')
      expect(address).toBe('0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0')
      expect(chainId).toBe(1)
      return {
        decimals: 0,
        name: '',
        symbol: '',
        totalSupply: ''
      }
    })

    const { user } = render(<AddToken data={{ notifyData: { chain: { id: 1 } } }} />)

    const contractAddressLabel = screen.getByLabelText(`Enter token's address`)
    await user.type(contractAddressLabel, '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0')
    const setAddressButton = screen.getByRole('button', { name: 'Set Address' })
    await user.click(setAddressButton)

    expect(link.send).toHaveBeenCalledTimes(1)
    expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
      view: 'tokens',
      data: {
        notify: 'addToken',
        notifyData: {
          chain: { id: 1 },
          address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
          error: `COULD NOT FIND TOKEN WITH ADDRESS 0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0`,
          tokenData: {
            decimals: 0,
            name: '',
            symbol: '',
            totalSupply: ''
          }
        }
      }
    })
  })

  it('should update add token navigation with the contract details when a valid address is entered for a connected chain', async () => {
    const mockTokenData = {
      decimals: 420,
      name: 'FAKE COIN',
      symbol: 'FAKE',
      totalSupply: '100000'
    }

    link.invoke.mockImplementationOnce((action, address, chainId) => {
      expect(action).toBe('tray:getTokenDetails')
      expect(address).toBe('0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0')
      expect(chainId).toBe(1)
      return mockTokenData
    })

    const { user } = render(<AddToken data={{ notifyData: { chain: { id: 1 } } }} />)

    const contractAddressLabel = screen.getByLabelText(`Enter token's address`)
    await user.type(contractAddressLabel, '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0')
    const setAddressButton = screen.getByRole('button', { name: 'Set Address' })
    await user.click(setAddressButton)

    expect(link.send).toHaveBeenCalledTimes(1)
    expect(link.send).toHaveBeenCalledWith('nav:forward', 'dash', {
      view: 'tokens',
      data: {
        notify: 'addToken',
        notifyData: {
          error: null,
          chain: { id: 1 },
          address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
          tokenData: mockTokenData
        }
      }
    })
  })
})

describe('displaying errors', () => {
  it('should allow the user to navigate back when displaying an error', () => {
    render(
      <AddToken
        data={{ notifyData: { chain: { id: 137 }, error: 'INVALID CONTRACT ADDRESS', address: '0xabc' } }}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(1)
    expect(buttons[0].textContent).toBe('BACK')
  })

  it(`should allow the user to proceed if we are unable to verify the token data`, () => {
    render(
      <AddToken
        data={{
          notifyData: {
            chain: { id: 137 },
            error: `COULD NOT FIND TOKEN WITH ADDRESS BLAH BLAH`,
            address: '0xabc'
          }
        }}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toBe('BACK')
    expect(buttons[1].textContent).toBe('ADD ANYWAY')
  })
})

describe('setting token details', () => {
  it('should show the user that they are editing a token', () => {
    render(
      <AddToken
        data={{
          notifyData: {
            chain: { id: 1 },
            address: '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D4',
            isEdit: true,
            tokenData: {
              decimals: 12,
              symbol: 'FAKE',
              name: 'FAKE',
              address: '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D4',
              totalSupply: '100'
            }
          }
        }}
      />
    )

    const heading = screen.getByTestId('addTokenFormTitle')
    const button = screen.getByRole('button')
    expect(heading.textContent).toBe('Edit Token')
    expect(button.textContent).toBe('Save')
  })

  it('should show the user that they are adding a token', () => {
    render(
      <AddToken
        data={{
          notifyData: { chain: { id: 1 }, address: '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D4' }
        }}
      />
    )

    const heading = screen.getByTestId('addTokenFormTitle')
    expect(heading.textContent).toBe('Add New Token')
  })

  it('should prompt to fill in missing token data', () => {
    render(
      <AddToken
        data={{
          notifyData: { chain: { id: 1 }, address: '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D4' }
        }}
      />
    )

    const button = screen.getByRole('button')
    expect(button.textContent).toBe('Fill in Token Details')
  })

  it('should show defaults in fields where token data is missing', () => {
    render(
      <AddToken
        data={{ notifyData: { chain: { id: 137 }, address: '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D4' } }}
      />
    )

    const contractAddressInput = screen.getByRole('heading')
    const tokenNameInput = screen.getByLabelText('Token Name')
    const tokenSymbolInput = screen.getByLabelText('Symbol')
    const tokenDecimalsInput = screen.getByLabelText('Decimals')

    expect(contractAddressInput.textContent).toEqual('0x64aa3364D7e7f1D4')
    expect(tokenNameInput.value).toEqual('Token Name')
    expect(tokenSymbolInput.value).toEqual('Symbol')
    expect(tokenDecimalsInput.value).toEqual('?')
  })

  it('should populate fields with token data', async () => {
    store.setPrimary('ethereum', 137, { connected: true })

    const mockToken = { name: 'EvoTradeWallet Test on Polygon', symbol: 'mFRT', decimals: 18, totalSupply: '1066' }

    render(
      <AddToken
        data={{
          notifyData: {
            chain: { id: 1 },
            address: '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D4',
            tokenData: mockToken
          }
        }}
      />
    )

    const contractAddressInput = screen.getByRole('heading')
    const tokenNameInput = screen.getByLabelText('Token Name')
    const tokenSymbolInput = screen.getByLabelText('Symbol')
    const tokenDecimalsInput = screen.getByLabelText('Decimals')

    expect(contractAddressInput.textContent).toEqual('0x64aa3364D7e7f1D4')
    await waitFor(() => expect(tokenNameInput.value).toEqual('EvoTradeWallet Test on Polygon'), { timeout: 200 })
    expect(tokenSymbolInput.value).toEqual('mFRT')
    expect(tokenDecimalsInput.value).toEqual('18')
  })
})
